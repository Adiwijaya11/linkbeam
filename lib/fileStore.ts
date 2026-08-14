import { put, del } from '@vercel/blob';

// Shared in-memory file metadata store
// Binary data goes to Vercel Blob; metadata stays in RAM.

export interface StoredFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storageType: 'blob' | 'ram';
  blobUrl?: string;      // Present if storageType is 'blob'
  buffer?: Buffer;       // Present if storageType is 'ram'
  senderName: string;
  sentAt: number;
}

export type FileMetadata = Omit<StoredFile, 'buffer'>;

// roomCode → list of files (max 20 per room)
export const roomFilesStore = new Map<string, StoredFile[]>();

export function getFiles(code: string): StoredFile[] {
  return roomFilesStore.get(code) ?? [];
}

export function addFile(code: string, file: StoredFile): void {
  const existing = roomFilesStore.get(code) ?? [];
  const nextList = [...existing, file];

  // Cleanup oldest blobs when exceeding 20 files
  if (nextList.length > 20) {
    const toRemove = nextList.slice(0, nextList.length - 20);
    for (const f of toRemove) {
      if (f.storageType === 'blob' && f.blobUrl) {
        del(f.blobUrl).catch(() => {});
      }
    }
  }

  roomFilesStore.set(code, nextList.slice(-20));
}

export function getFile(code: string, id: string): StoredFile | undefined {
  return (roomFilesStore.get(code) ?? []).find((f) => f.id === id);
}

export function removeFile(code: string, id: string): void {
  const files = roomFilesStore.get(code) ?? [];
  const fileToRemove = files.find((f) => f.id === id);
  if (fileToRemove) {
    roomFilesStore.set(code, files.filter((f) => f.id !== id));
    if (fileToRemove.storageType === 'blob' && fileToRemove.blobUrl) {
      del(fileToRemove.blobUrl).catch(() => {});
    }
  }
}

export function clearFiles(code: string): void {
  const files = roomFilesStore.get(code) ?? [];
  roomFilesStore.delete(code);
  for (const file of files) {
    if (file.storageType === 'blob' && file.blobUrl) {
      del(file.blobUrl).catch(() => {});
    }
  }
}

// Files smaller than 4 MB go to RAM, larger (photos/videos) go to Vercel Blob
const RAM_LIMIT = 4 * 1024 * 1024;

export async function saveUploadStream(
  code: string,
  id: string,
  webStream: ReadableStream<Uint8Array>,
  size: number,
  name: string,
  type: string,
  senderName: string
): Promise<StoredFile> {
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN;
  const needsBlob =
    hasToken && (size > RAM_LIMIT || type.startsWith('video/') || type.startsWith('image/'));

  if (needsBlob) {
    const blob = await put(`linkbeam/${code}/${id}/${encodeURIComponent(name)}`, webStream, {
      access: 'public',
      contentType: type || 'application/octet-stream',
    });

    return {
      id,
      name,
      size,
      type,
      storageType: 'blob',
      blobUrl: blob.url,
      senderName,
      sentAt: Date.now(),
    };
  }

  // Small files or no Blob token → RAM
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  const reader = webStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalBytes += value.length;
    }
  } finally {
    reader.releaseLock();
  }

  return {
    id,
    name,
    size: totalBytes,
    type,
    storageType: 'ram',
    buffer: Buffer.concat(chunks),
    senderName,
    sentAt: Date.now(),
  };
}

// Cleanup expired files every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    const EXPIRY_MS = 60 * 60 * 1000;
    for (const [code, files] of roomFilesStore.entries()) {
      const expired = files.filter((f) => now - f.sentAt > EXPIRY_MS);
      const active = files.filter((f) => now - f.sentAt <= EXPIRY_MS);
      if (expired.length > 0) {
        roomFilesStore.set(code, active);
        for (const f of expired) {
          if (f.storageType === 'blob' && f.blobUrl) {
            del(f.blobUrl).catch(() => {});
          }
        }
      }
      if (active.length === 0) roomFilesStore.delete(code);
    }
  }, 5 * 60 * 1000);
}
