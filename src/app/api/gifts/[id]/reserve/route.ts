import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/push';

const formatGuaranies = (price: number) =>
  new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
  }).format(price);

/**
 * Reserva una unidad del regalo de forma atómica.
 *
 * Todo ocurre en un único UPDATE condicional: si dos invitados confirman al
 * mismo tiempo, Postgres serializa las escrituras y ninguna reserva se pierde.
 * El WHERE garantiza que nunca se reserve por encima del stock.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const body = await request.json();

    const guestName = typeof body.guestName === 'string' ? body.guestName.trim() : '';
    const reference = typeof body.reference === 'string' ? body.reference.trim() : '';

    if (!guestName || !reference) {
      return NextResponse.json(
        { error: 'MISSING_FIELDS', message: 'Falta el nombre o el número de comprobante.' },
        { status: 400 }
      );
    }

    const entry = `[${guestName}] ${reference}`;

    const affected = await prisma.$executeRaw`
      UPDATE "Gift"
      SET "timesPending" = "timesPending" + 1,
          "transfer_reference" = CASE
            WHEN "transfer_reference" IS NULL OR "transfer_reference" = '' THEN ${entry}
            ELSE "transfer_reference" || ' | ' || ${entry}
          END,
          "status" = CASE
            WHEN "timesGifted" + "timesPending" + 1 >= "stock" THEN 'PENDING_CONFIRMATION'
            ELSE 'AVAILABLE'
          END,
          "updatedAt" = NOW()
      WHERE "id" = ${params.id}
        AND "timesGifted" + "timesPending" < "stock"
    `;

    if (affected === 0) {
      const gift = await prisma.gift.findUnique({ where: { id: params.id } });
      if (!gift) {
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json(
        {
          error: 'OUT_OF_STOCK',
          message: 'Justo se agotaron las unidades de este regalo. ¡Gracias igual por la intención!',
        },
        { status: 409 }
      );
    }

    // Aviso a los administradores. Va después del UPDATE, así sólo notifica
    // reservas que realmente quedaron registradas, y aislado en su propio
    // try/catch para que una caída del servicio de push no le muestre un error
    // al invitado por un regalo que sí se guardó.
    try {
      const gift = await prisma.gift.findUnique({ where: { id: params.id } });
      if (gift) {
        const restantes = gift.stock - gift.timesGifted - gift.timesPending;
        await notifyAdmins({
          title: '🎁 ¡Nuevo regalo!',
          body:
            `${guestName} confirmó "${gift.title}" (${formatGuaranies(gift.price)}).\n` +
            `Comprobante: ${reference}\n` +
            `Quedan ${restantes} de ${gift.stock}.`,
          url: '/admin',
        });
      }
    } catch (notifyError) {
      console.error('No se pudo notificar la reserva:', notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error reserving gift:', error);
    return NextResponse.json({ error: 'Failed to reserve gift' }, { status: 500 });
  }
}
