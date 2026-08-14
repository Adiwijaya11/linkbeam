import { handleUpload } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { addFile } from '@/lib/fileStore';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;
  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: undefined,
          tokenPayload: body.clientPayload,
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