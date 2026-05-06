import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');

  if (!ref) {
    return NextResponse.json({ exists: false });
  }

  try {
    // Buscamos si existe algún regalo que contenga esta referencia en su campo transfer_reference
    const existingGift = await prisma.gift.findFirst({
      where: {
        transfer_reference: {
          contains: ref,
        },
      },
    });

    return NextResponse.json({ exists: !!existingGift });
  } catch (error) {
    return NextResponse.json({ error: 'Error validating reference' }, { status: 500 });
  }
}
