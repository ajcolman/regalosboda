import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
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
  try {
    const params = await context.params;
    const body = await request.json();
    
    // Parse numeric fields if they exist
    const updateData: any = { ...body };
    if (body.price !== undefined) updateData.price = parseFloat(body.price);
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.timesGifted !== undefined) updateData.timesGifted = parseInt(body.timesGifted);
    if (body.timesPending !== undefined) updateData.timesPending = parseInt(body.timesPending);
    
    const gift = await prisma.gift.update({
      where: { id: params.id },
      data: updateData,
    });
    
    return NextResponse.json(gift);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update gift' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
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
