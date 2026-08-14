import fs from 'fs';
import path from 'path';
import os from 'os';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

// Shared in-memory file store (module-level singleton)
// Both /files and /files/[id] routes import from here to share the same Map instance.

// 100 MB Limit for RAM Storage
export const RAM_STORAGE_LIMIT = 100 * 1024 * 1024;

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  buffer?: Buffer;            // Present if storageType is 'ram'
  storageType: 'ram' | 'disk';
  filePath?: string;          // Present if storageType is 'disk'
  senderName: string;
  sentAt: number;
}

export type FileMetadata = Omit<StoredFile, 'buffer'>;

// roomCode → list of files (max 20 per room)
export const roomFilesStore = new Map<string, StoredFile[]>();

// Track active downloads: fileId -> count of active readers
export const activeDownloads = new Map<string, number>();

export function incrementActiveDownload(fileId: string) {
  activeDownloads.set(fileId, (activeDownloads.get(fileId) ?? 0) + 1);
}

export function decrementActiveDownload(fileId: string) {
  const current = activeDownloads.get(fileId) ?? 0;
  if (current <= 1) {
    activeDownloads.delete(fileId);
  } else {
    activeDownloads.set(fileId, current - 1);
  }
}

export function getFiles(code: string): StoredFile[] {
  return roomFilesStore.get(code) ?? [];
}

export function addFile(code: string, file: StoredFile): void {
  const existing = roomFilesStore.get(code) ?? [];
  const nextList = [...existing, file];

  // Cleanup disk storage if we exceed the room limit of 20 files
  if (nextList.length > 20) {
    const toRemove = nextList.slice(0, nextList.length - 20);
    for (const f of toRemove) {
      if (f.storageType === 'disk' && f.filePath) {
        try {
          if (fs.existsSync(f.filePath)) {
            fs.unlinkSync(f.filePath);
          }
        } catch (err) {
          console.error(`Failed to delete oldest file from disk: ${f.filePath}`, err);
        }
      }
    }
  }

  roomFilesStore.set(code, nextList.slice(-20));
}

export function getFile(code: string, id: string): StoredFile | undefined {
  return (roomFilesStore.get(code) ?? []).find((f) => f.id === id);
}

/**
 * Remove a specific file from memory and disk.
 */
export function removeFile(code: string, id: string): void {
  const files = roomFilesStore.get(code) ?? [];
  const fileToRemove = files.find((f) => f.id === id);

  if (fileToRemove) {
    roomFilesStore.set(code, files.filter((f) => f.id !== id));
    if (fileToRemove.storageType === 'disk' && fileToRemove.filePath) {
      try {
        if (fs.existsSync(fileToRemove.filePath)) {
          fs.unlinkSync(fileToRemove.filePath);
        }
      } catch (err) {
        console.error(`Failed to delete file on explicit remove: ${fileToRemove.filePath}`, err);
      }
    }
  }
}

/**
 * Clear all files in a room (both RAM and disk).
 */
export function clearFiles(code: string): void {
  const files = roomFilesStore.get(code) ?? [];
  roomFilesStore.delete(code);

  for (const file of files) {
    if (file.storageType === 'disk' && file.filePath) {
      try {
        if (fs.existsSync(file.filePath)) {
          fs.unlinkSync(file.filePath);
        }
      } catch (err) {
        console.error(`Failed to delete file on room clear: ${file.filePath}`, err);
      }
    }
  }

  // Delete the room directory itself
  const roomDir = path.join(process.cwd(), 'tmp', 'linkbeam', code);
  try {
    if (fs.existsSync(roomDir)) {
      fs.rmdirSync(roomDir);
    }
  } catch {}
}

/**
 * Cleanup expired files (files older than 1 hour).
 */
export function cleanupExpiredFiles(): void {
  const now = Date.now();
  const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

  for (const [code, files] of roomFilesStore.entries()) {
    const activeFiles: StoredFile[] = [];
    const expiredFiles: StoredFile[] = [];

    for (const file of files) {
      if (now - file.sentAt > EXPIRY_MS) {
        expiredFiles.push(file);
      } else {
        activeFiles.push(file);
      }
    }

    if (expiredFiles.length > 0) {
      roomFilesStore.set(code, activeFiles);
      for (const file of expiredFiles) {
        if (file.storageType === 'disk' && file.filePath) {
          try {
            if (fs.existsSync(file.filePath)) {
              fs.unlinkSync(file.filePath);
            }
          } catch (err) {
            console.error(`Failed to delete expired file: ${file.filePath}`, err);
          }
        }
      }
    }

    // Clean up empty directories
    if (activeFiles.length === 0) {
      roomFilesStore.delete(code);
      const roomDir = path.join(process.cwd(), 'tmp', 'linkbeam', code);
      try {
        if (fs.existsSync(roomDir)) {
          fs.rmdirSync(roomDir);
        }
      } catch {}
    }
  }
}

/**
 * Save an upload stream either to RAM or Disk (hybrid storage helper)
 */
export async function saveUploadStream(
  code: string,
  id: string,
  webStream: ReadableStream<Uint8Array>,
  size: number,
  name: string,
  type: string,
  senderName: string
): Promise<StoredFile> {
  const roomDir = path.join(process.cwd(), 'tmp', 'linkbeam', code);
  const tempFilePath = path.join(roomDir, id);

  // 1. Determine storage type (Disk if > limit)
  let useDisk = size > RAM_STORAGE_LIMIT;

  // Pre-check RAM allocation to prevent immediate OOM
  if (!useDisk) {
    try {
      const freeMem = os.freemem();
      if (freeMem < size * 3) {
        // Less than 3x the file size in free memory -> default to disk
        useDisk = true;
      }
    } catch {}
  }

  if (useDisk) {
    fs.mkdirSync(roomDir, { recursive: true });
    const writeStream = fs.createWriteStream(tempFilePath);
    await pipeline(Readable.fromWeb(webStream as any), writeStream);

    return {
      id,
      name,
      size,
      type,
      storageType: 'disk',
      filePath: tempFilePath,
      senderName,
      sentAt: Date.now(),
    };
  }

  // 2. Try RAM buffering with Disk fallback
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = webStream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;

      if (totalBytes > RAM_STORAGE_LIMIT) {
        throw new Error('RAM limit exceeded');
      }
    }

    // Allocate buffer
    const buffer = Buffer.concat(chunks);

    return {
      id,
      name,
      size: totalBytes,
      type,
      storageType: 'ram',
      buffer,
      senderName,
      sentAt: Date.now(),
    };
  } catch (err) {
    console.warn(`[Storage Fallback] RAM buffering failed or exceeded for ${name}. Writing to disk.`, err);

    fs.mkdirSync(roomDir, { recursive: true });
    const writeStream = fs.createWriteStream(tempFilePath);

    // Write all currently read chunks
    for (const chunk of chunks) {
      writeStream.write(chunk);
    }

    // Read the remaining bytes and write directly to disk
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        writeStream.write(value);
        totalBytes += value.length;
      }
    } finally {
      writeStream.end();
    }

    // Wait for the stream to finish writing to disk
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    return {
      id,
      name,
      size: totalBytes,
      type,
      storageType: 'disk',
      filePath: tempFilePath,
      senderName,
      sentAt: Date.now(),
    };
  }
}

// Background scheduler for cleaning up expired files
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    try {
      cleanupExpiredFiles();
    } catch (err) {
      console.error('Error running expired files cleanup:', err);
    }
  }, 5 * 60 * 1000); // run every 5 minutes
}
