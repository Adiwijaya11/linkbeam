import { NextRequest, NextResponse } from 'next/server';
import { getFile, removeFile, incrementActiveDownload, decrementActiveDownload } from '@/lib/fileStore';
import fs from 'fs';
import { Readable } from 'stream';

// GET /api/room/[code]/files/[fileId]
// Streams the raw binary file directly to the browser — zero overhead, full speed
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; fileId: string }> }
) {
  const { code, fileId } = await params;
  const file = getFile(code, fileId);

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // 1. Handle RAM Storage
  if (file.storageType === 'ram' && file.buffer) {
    return new NextResponse(new Uint8Array(file.buffer), {
      status: 200,
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(file.size),
        'Cache-Control': 'no-store',
      },
    });
  }

  // 2. Handle Disk Storage
  if (file.storageType === 'disk' && file.filePath) {
    if (!fs.existsSync(file.filePath)) {
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
    }

    incrementActiveDownload(file.id);

    const fileStream = fs.createReadStream(file.filePath);
    const webStream = Readable.toWeb(fileStream);

    let isCleaned = false;
    const cleanup = () => {
      if (isCleaned) return;
      isCleaned = true;

      decrementActiveDownload(file.id);

      // Wait 5 seconds after download finishes before removing the file
      // to allow any browser-side range request retries to complete.
      setTimeout(() => {
        removeFile(code, file.id);
      }, 5000);
    };

    fileStream.on('close', cleanup);
    fileStream.on('error', (err) => {
      console.error(`[Storage] Stream read error for file ${file.name}:`, err);
      cleanup();
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': file.type,
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(file.size),
        'Cache-Control': 'no-store',
      },
    });
  }

  return NextResponse.json({ error: 'Invalid storage type' }, { status: 500 });
}
