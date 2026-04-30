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
    
    const gift = await prisma.gift.update({
      where: { id: params.id },
      data: body,
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
