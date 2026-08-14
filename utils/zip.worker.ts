/* eslint-disable no-restricted-globals */

// ── CRC-32 lookup table ────────────────────────────────────────────
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

// ── Little-endian helpers ──────────────────────────────────────────
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

// Listen to message events from the main thread
self.onmessage = async (e: MessageEvent) => {
  const { entries } = e.data as { entries: { path: string; data: ArrayBuffer }[] };
  if (!entries) return;

  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralDirs: Uint8Array[] = [];
  const offsets: number[] = [];
  let offset = 0;

  const total = entries.length;

  for (let i = 0; i < total; i++) {
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

    // Notify progress back to the UI
    (self as any).postMessage({ type: 'progress', done: i + 1, total });
  }

  const cdBytes = concat(...centralDirs);
  const cdStart = offset;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]), // End of central dir sig
    le16(0),
    le16(0),
    le16(total),
    le16(total),
    le32(cdBytes.length),
    le32(cdStart),
    le16(0),            // comment length
  );

  // Map to backing ArrayBuffers for transferring ownership
  const localBuffers = localParts.map((u) => u.buffer as ArrayBuffer);
  const cdBuffer = cdBytes.buffer as ArrayBuffer;
  const eocdBuffer = eocd.buffer as ArrayBuffer;

  const buffers = [...localBuffers, cdBuffer, eocdBuffer];

  // Post complete event, transferring the buffers to avoid copy overhead
  (self as any).postMessage({ type: 'complete', buffers }, buffers);
};
