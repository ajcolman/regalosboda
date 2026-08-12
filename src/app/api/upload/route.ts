import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';

const TIPOS_PERMITIDOS = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB

/**
 * El nombre viene del cliente y se usa para armar la clave del blob, así que
 * nos quedamos sólo con el archivo (sin directorios) y con caracteres seguros.
 * Evita que alguien escriba fuera de `wedding-registry/`.
 */
function nombreSeguro(bruto: string) {
  const soloArchivo = bruto.split(/[\\/]/).pop() ?? '';
  const limpio = soloArchivo.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/^\.+/, '').slice(0, 120);
  return limpio || 'image.webp';
}

export async function POST(request: Request): Promise<NextResponse> {
  // Sin esto, cualquiera podía subir archivos al Blob de la cuenta —y pagarlos vos.
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const filename = nombreSeguro(searchParams.get('filename') || 'image.webp');

  // La entrada se valida antes que la configuración del servidor: un pedido
  // mal formado se rechaza igual, esté o no el token configurado.
  const contentType = request.headers.get('content-type')?.split(';')[0].trim() ?? '';
  if (!TIPOS_PERMITIDOS.includes(contentType)) {
    return NextResponse.json(
      { error: 'UNSUPPORTED_TYPE', message: 'Sólo se aceptan imágenes.' },
      { status: 415 }
    );
  }

  const declarado = Number(request.headers.get('content-length') ?? '0');
  if (declarado > TAMANO_MAXIMO) {
    return NextResponse.json(
      { error: 'TOO_LARGE', message: 'La imagen supera los 10 MB.' },
      { status: 413 }
    );
  }

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
      contentType,
      addRandomSuffix: true,
    });

    return NextResponse.json(blob);
  } catch (error) {
    console.error('Error uploading file to Vercel Blob:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
