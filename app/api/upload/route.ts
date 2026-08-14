import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob token is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
          maximumSizeInBytes: 1024 * 1024 * 1024, // 1 GB
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Blob upload completed successfully:', blob.url);
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown upload handler error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}