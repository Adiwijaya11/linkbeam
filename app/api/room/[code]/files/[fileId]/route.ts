import { NextRequest, NextResponse } from 'next/server';
import { getFile } from '@/lib/fileStore';

// GET /api/room/[code]/files/[fileId]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; fileId: string }> }
) {
  const { code, fileId } = await params;
  const file = getFile(code, fileId);

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // 1. Blob storage — redirect to Vercel Blob CDN URL
  if (file.storageType === 'blob' && file.blobUrl) {
    return NextResponse.redirect(file.blobUrl);
  }

  // 2. RAM storage — stream from buffer
  if (file.storageType === 'ram' && file.buffer) {
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Content-Length': String(file.size),
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json({ error: 'File unavailable' }, { status: 404 });
}