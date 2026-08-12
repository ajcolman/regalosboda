import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/adminAuth';
import { deriveStatusField } from '@/lib/giftStatus';

/**
 * Sólo administradores: devuelve el regalo completo, incluido
 * `transfer_reference`. La página pública del regalo no usa esta ruta, lee de
 * Prisma en el servidor.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const gift = await prisma.gift.findUnique({
      where: { id: params.id },
    });
    
    if (!gift) return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
    return NextResponse.json(gift);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch gift' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const body = await request.json();
    
    // Sólo estos campos son editables. Lista blanca en vez de `{ ...body }`
    // para que el cliente pueda mandar el regalo entero (con su detalle de
    // aportes y sus timestamps) sin que Prisma lo rechace, y para que `status`
    // —que siempre se deriva de los contadores— no se pueda pisar desde afuera.
    const updateData: Record<string, unknown> = {};

    for (const field of ['title', 'description', 'image_url', 'transfer_reference'] as const) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }
    if (body.isVisible !== undefined) updateData.isVisible = Boolean(body.isVisible);
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.timesGifted !== undefined) updateData.timesGifted = parseInt(body.timesGifted);
    if (body.timesPending !== undefined) updateData.timesPending = parseInt(body.timesPending);

    let gift = await prisma.gift.update({
      where: { id: params.id },
      data: updateData,
    });

    const derived = deriveStatusField(gift);
    if (gift.status !== derived) {
      gift = await prisma.gift.update({
        where: { id: params.id },
        data: { status: derived },
      });
    }

    return NextResponse.json(gift);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const params = await context.params;
    await prisma.gift.delete({
      where: { id: params.id },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete gift' }, { status: 500 });
  }
}
