/**
 * Minimal ZIP creator (STORE method, no compression).
 * Pure TypeScript — zero dependencies.
 * Spec: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
 */

export interface ZipEntry {
  /** Relative path inside the ZIP (use forward slashes) */
  path: string;
  data: ArrayBuffer;
}

// ── CRC-32 lookup table (for main-thread fallback) ───────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Little-endian helpers (for main-thread fallback) ──────────────────
const le16 = (n: number) => new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
const le32 = (n: number) =>
  new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// ── Main Thread Zipping Fallback ──────────────────────────────────────
async function createZipFallback(
  entries: ZipEntry[],
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  for (let i = 0; i < entries.length; i++) {
    const { path, data } = entries[i];
    const pathBytes = enc.encode(path);
    const dataBytes = new Uint8Array(data);
    const checksum = crc32(dataBytes);
    const size = dataBytes.length;

    offsets.push(offset);

    const local = concat(
      new Uint8Array([0x50, 0x4b, 0x03, 0x04]), // Local file header sig
      le16(20),         // version needed to extract
      le16(0),          // general purpose bit flags
      le16(0),          // compression method: STORE
      le16(0),          // last mod file time
      le16(0),          // last mod file date
      le32(checksum),
      le32(size),       // compressed size
      le32(size),       // uncompressed size
      le16(pathBytes.length),
      le16(0),          // extra field length
      pathBytes,
      dataBytes,
    );
    localParts.push(local);
    offset += local.length;

    const cd = concat(
      new Uint8Array([0x50, 0x4b, 0x01, 0x02]), // Central directory sig
      le16(0x0314),     // version made by (Unix, spec 20)
      le16(20),         // version needed
      le16(0),          // flags
      le16(0),          // STORE
      le16(0),          // mod time
      le16(0),          // mod date
      le32(checksum),
      le32(size),
      le32(size),
      le16(pathBytes.length),
      le16(0),          // extra length
      le16(0),          // comment length
      le16(0),          // disk number start
      le16(0),          // internal file attrs
      le32(0),          // external file attrs
      le32(offsets[i]),
      pathBytes,
    );
    centralDirs.push(cd);

    onProgress?.(i + 1, entries.length);

    // Yield to browser every 10 files so UI stays responsive
    if (i % 10 === 9) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const cdBytes = concat(...centralDirs);
  const cdStart = offset;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // End of central dir sig
    le16(0),
    le16(0),
    le16(entries.length),
    le16(entries.length),
    le32(cdBytes.length),
    le32(cdStart),
    le16(0),            // comment length
  );

  return new Blob(
    [...localParts.map(u => u.buffer as ArrayBuffer), cdBytes.buffer as ArrayBuffer, eocd.buffer as ArrayBuffer],
    { type: 'application/zip' },
  );
}

// ── Public API ────────────────────────────────────────────────────────
export function createZip(
  entries: ZipEntry[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let worker: Worker | null = null;
    let fallbackTriggered = false;

    // Helper to fall back to main thread zipping
    const triggerFallback = async (reason: any) => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;
      console.warn('[Web Worker Fallback] Falling back to main-thread zipping. Reason:', reason);
      if (worker) {
        try {
          worker.terminate();
        } catch {}
      }
      try {
        const zipBlob = await createZipFallback(entries, onProgress);
        resolve(zipBlob);
      } catch (err) {
        reject(err);
      }
    };

    try {
      // Try to instantiate the Web Worker
      worker = new Worker(new URL('./zip.worker.ts', import.meta.url));

      worker.onmessage = (e) => {
        const { type, done, total, buffers } = e.data;
        if (type === 'progress') {
          onProgress?.(done, total);
        } else if (type === 'complete') {
          const zipBlob = new Blob(buffers, { type: 'application/zip' });
          worker?.terminate();
          resolve(zipBlob);
        }
      };

      worker.onerror = (err) => {
        // If worker fails during load/run, trigger fallback
        triggerFallback(err);
      };

      // Transfer raw ArrayBuffers of all files to worker
      const transferables = entries.map((entry) => entry.data);
      worker.postMessage({ entries }, transferables);
    } catch (err) {
      // Trigger fallback immediately if construction throws
      triggerFallback(err);
    }
  });
}
