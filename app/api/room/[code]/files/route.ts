import { NextRequest, NextResponse } from 'next/server';
import { getFiles, addFile, saveUploadStream } from '@/lib/fileStore';

// GET: list file metadata only (no binary — keeps polling response tiny)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const files = getFiles(code).map(({ buffer: _, ...meta }) => meta);
  return NextResponse.json({ files });
}

// POST: receive binary file via stream
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const fileNameHeader = req.headers.get('x-file-name');
  const senderNameHeader = req.headers.get('x-sender-name');
  const fileTypeHeader = req.headers.get('x-file-type') || 'application/octet-stream';
  const fileSizeHeader = req.headers.get('x-file-size') || req.headers.get('content-length');

  if (!fileNameHeader || !senderNameHeader) {
    return NextResponse.json({ error: 'Missing x-file-name or x-sender-name' }, { status: 400 });
  }

  const name = decodeURIComponent(fileNameHeader);
  const senderName = decodeURIComponent(senderNameHeader);
  const type = fileTypeHeader;
  const size = fileSizeHeader ? parseInt(fileSizeHeader, 10) : 0;

  if (!req.body) {
    return NextResponse.json({ error: 'Empty body' }, { status: 400 });
  }

  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);

  try {
    const storedFile = await saveUploadStream(
      code,
      id,
      req.body,
      size,
      name,
      type,
      senderName
    );

    addFile(code, storedFile);

    return NextResponse.json({ id, name: storedFile.name, size: storedFile.size });
  } catch (err) {
    console.error('File stream upload failed:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
