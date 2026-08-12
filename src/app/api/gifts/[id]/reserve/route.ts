import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notifyAdmins } from '@/lib/push';
import { excedeLimite, ipDe } from '@/lib/rateLimit';

/**
 * Esta ruta es pública por diseño —los invitados no tienen cuenta—, así que sin
 * ningún freno alguien podría reservar la lista entera en segundos y dejarla
 * toda "no disponible" el día de la boda. El tope es holgado a propósito:
 * ninguna familia real reserva quince regalos en una hora, y si el límite falla
 * preferimos que se cuele un pedido de más antes que rechazar uno legítimo.
 */
const MAX_RESERVAS = 15;
const VENTANA_MS = 60 * 60 * 1000;

/** Topes de longitud, para que el texto acumulado no crezca sin control. */
const MAX_NOMBRE = 120;
const MAX_REFERENCIA = 100;

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

    if (guestName.length > MAX_NOMBRE || reference.length > MAX_REFERENCIA) {
      return NextResponse.json(
        { error: 'FIELDS_TOO_LONG', message: 'El nombre o el comprobante son demasiado largos.' },
        { status: 400 }
      );
    }

    if (excedeLimite('reserve', ipDe(request), MAX_RESERVAS, VENTANA_MS)) {
      return NextResponse.json(
        {
          error: 'RATE_LIMITED',
          message: 'Recibimos varias confirmaciones desde tu conexión. Probá de nuevo en un rato.',
        },
        { status: 429 }
      );
    }

    const entry = `[${guestName}] ${reference}`;

    // El monto del aporte arranca en el precio del regalo; si la persona
    // transfirió otra cosa, el administrador lo rectifica desde el panel.
    // Lo leemos antes de abrir la transacción para no alargarla.
    const priced = await prisma.gift.findUnique({
      where: { id: params.id },
      select: { price: true },
    });

    if (!priced) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    // El UPDATE condicional sigue siendo el que admite o rechaza la reserva; el
    // aporte se registra dentro de la misma transacción para que nunca quede
    // una unidad contabilizada sin su detalle de quién la puso.
    const affected = await prisma.$transaction(async (tx) => {
      const updated = await tx.$executeRaw`
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

      if (updated === 0) return 0;

      await tx.contribution.create({
        data: {
          giftId: params.id,
          guestName,
          reference,
          amount: priced.price,
          status: 'PENDING',
        },
      });

      return updated;
    });

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
