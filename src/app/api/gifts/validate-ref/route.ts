import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');

  if (!ref) {
    return NextResponse.json({ exists: false });
  }

  try {
    // El comprobante puede estar en el detalle de aportes (lo actual) o en el
    // campo `transfer_reference` del regalo (histórico): revisamos los dos.
    const [existingContribution, existingGift] = await Promise.all([
      prisma.contribution.findFirst({ where: { reference: ref } }),
      prisma.gift.findFirst({
        where: {
          transfer_reference: {
            contains: ref,
          },
        },
      }),
    ]);

    return NextResponse.json({ exists: !!existingContribution || !!existingGift });
  } catch (error) {
    return NextResponse.json({ error: 'Error validating reference' }, { status: 500 });
  }
}
