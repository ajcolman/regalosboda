import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const gifts = await prisma.gift.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(gifts);
  } catch (error) {
    console.error('Error fetching gifts:', error);
    return NextResponse.json({ error: 'Failed to fetch gifts' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, image_url, price, stock, isVisible } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }

    const gift = await prisma.gift.create({
      data: {
        title,
        description,
        image_url,
        price: parseFloat(price),
        stock: stock !== undefined ? parseInt(stock) : 1,
        isVisible: isVisible !== undefined ? isVisible : true,
      },
    });

    return NextResponse.json(gift, { status: 201 });
  } catch (error) {
    console.error('Error creating gift:', error);
    return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 });
  }
}
