import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/adminAuth';

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an array of gifts' }, { status: 400 });
    }

    const gifts = await prisma.$transaction(
      body.map((gift) => {
        return prisma.gift.create({
          data: {
            title: gift.title,
            description: gift.description || null,
            image_url: gift.image_url || null,
            price: parseFloat(gift.price),
            stock: gift.stock !== undefined ? parseInt(gift.stock) : 1,
            isVisible: gift.isVisible !== undefined ? gift.isVisible : true,
          }
        });
      })
    );

    return NextResponse.json({ message: `Successfully imported ${gifts.length} gifts`, count: gifts.length }, { status: 201 });
  } catch (error) {
    console.error('Error importing gifts:', error);
    return NextResponse.json({ error: 'Failed to import gifts' }, { status: 500 });
  }
}
