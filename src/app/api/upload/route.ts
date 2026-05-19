import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename') || 'image.webp';

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error('BLOB_READ_WRITE_TOKEN is missing from environment variables');
    return NextResponse.json({ error: 'Blob storage credentials not configured' }, { status: 500 });
  }

  try {
    if (!request.body) {
      return NextResponse.json({ error: 'No body provided' }, { status: 400 });
    }

    // Subir el stream binario de la imagen directamente a Vercel Blob pasando el token explícitamente
    const blob = await put(`wedding-registry/${filename}`, request.body, {
      access: 'public',
      token,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
