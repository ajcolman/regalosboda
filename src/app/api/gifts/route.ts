import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/adminAuth';
import { deriveStatusField } from '@/lib/giftStatus';

/**
 * Sólo administradores: la respuesta incluye `transfer_reference` —nombres de
 * invitados y números de comprobante— y también los regalos ocultos. Las
 * páginas públicas no pasan por acá, leen de Prisma en el servidor.
 */
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

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
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, image_url, price, stock, isVisible, timesGifted, timesPending } = body;

    if (!title || price === undefined) {
      return NextResponse.json({ error: 'Title and price are required' }, { status: 400 });
    }

    const counters = {
      stock: stock !== undefined ? parseInt(stock) : 1,
      timesGifted: timesGifted !== undefined ? parseInt(timesGifted) : 0,
      timesPending: timesPending !== undefined ? parseInt(timesPending) : 0,
    };

    const gift = await prisma.gift.create({
      data: {
        title,
        description,
        image_url,
        price: parseFloat(price),
        isVisible: isVisible !== undefined ? isVisible : true,
        ...counters,
        status: deriveStatusField(counters),
      },
    });

    return NextResponse.json(gift, { status: 201 });
  } catch (error) {
    console.error('Error creating gift:', error);
    return NextResponse.json({ error: 'Failed to create gift' }, { status: 500 });
  }
}
