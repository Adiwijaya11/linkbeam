import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { addFile } from '@/lib/fileStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob is not configured. Please add BLOB_READ_WRITE_TOKEN in your Vercel project environment variables.' },
      { status: 500 }
    );
  }

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        return {
          allowedContentTypes: undefined, // allow all file types
          tokenPayload: clientPayload, // pass down clientPayload (senderName)
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const { senderName } = JSON.parse(tokenPayload || '{}');
        const fileId = Math.random().toString(36).slice(2) + Date.now().toString(36);
        const name = decodeURIComponent(blob.pathname.split('/').pop() || blob.pathname);
        addFile(code, {
          id: fileId,
          name: name,
          size: (blob as any).size || 0,
          type: blob.contentType,
          storageType: 'blob',
          blobUrl: blob.url,
          senderName: senderName || 'Unknown',
          sentAt: Date.now(),
        });
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}