import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'image.webp';

  try {
    if (!request.body) {
      return NextResponse.json({ error: 'No body provided' }, { status: 400 });
    }

    // Subir el stream binario de la imagen directamente a Vercel Blob
    const blob = await put(`wedding-registry/${filename}`, request.body, {
      access: 'public',
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
