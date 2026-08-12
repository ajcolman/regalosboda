import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/adminAuth';
import { deriveStatusField } from '@/lib/giftStatus';
import { counterFor, isContributionStatus } from '@/lib/contributions';

/**
 * Rectifica un aporte: su monto, sus datos, o su estado.
 *
 * Cambiar el monto no toca los contadores del regalo — una persona que
 * transfirió de menos igual ocupa su unidad. Cambiar el estado sí los mueve, y
 * siempre como delta (+1/-1) para no pisar los contadores de regalos que vienen
 * de antes de que existiera el detalle de aportes.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const params = await context.params;
    const body = await request.json();

    const data: { amount?: number; guestName?: string; reference?: string; status?: string } = {};

    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json(
          { error: 'INVALID_AMOUNT', message: 'El monto debe ser un número mayor o igual a cero.' },
          { status: 400 }
        );
      }
      data.amount = amount;
    }

    if (typeof body.guestName === 'string' && body.guestName.trim()) {
      data.guestName = body.guestName.trim();
    }

    if (typeof body.reference === 'string' && body.reference.trim()) {
      data.reference = body.reference.trim();
    }

    if (body.status !== undefined) {
      if (!isContributionStatus(body.status)) {
        return NextResponse.json(
          { error: 'INVALID_STATUS', message: 'Estado inválido.' },
          { status: 400 }
        );
      }
      data.status = body.status;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const current = await tx.contribution.findUnique({ where: { id: params.id } });
      if (!current) return null;

      const contribution = await tx.contribution.update({
        where: { id: params.id },
        data,
      });

      // Un aporte que pasa de pendiente a confirmado (o al revés) mueve una
      // unidad de un contador al otro.
      if (data.status && data.status !== current.status) {
        const toConfirmed = data.status === 'CONFIRMED';
        const gift = await tx.gift.findUniqueOrThrow({ where: { id: current.giftId } });
        const counters = {
          stock:        gift.stock,
          timesGifted:  Math.max(0, gift.timesGifted  + (toConfirmed ? 1 : -1)),
          timesPending: Math.max(0, gift.timesPending + (toConfirmed ? -1 : 1)),
        };
        return {
          contribution,
          gift: await tx.gift.update({
            where: { id: gift.id },
            data: {
              timesGifted:  counters.timesGifted,
              timesPending: counters.timesPending,
              status:       deriveStatusField(counters),
            },
          }),
        };
      }

      return {
        contribution,
        gift: await tx.gift.findUniqueOrThrow({ where: { id: current.giftId } }),
      };
    });

    if (!updated) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating contribution:', error);
    return NextResponse.json({ error: 'Failed to update contribution' }, { status: 500 });
  }
}

/** Elimina un aporte y libera la unidad que ocupaba. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const params = await context.params;

    const deleted = await prisma.$transaction(async (tx) => {
      const current = await tx.contribution.findUnique({ where: { id: params.id } });
      if (!current) return null;

      await tx.contribution.delete({ where: { id: params.id } });

      const counter = counterFor(current.status === 'CONFIRMED' ? 'CONFIRMED' : 'PENDING');
      const gift = await tx.gift.findUniqueOrThrow({ where: { id: current.giftId } });

      // No bajamos de cero: si los contadores venían desalineados con el
      // detalle, preferimos dejarlos quietos antes que corromperlos.
      if (gift[counter] === 0) return { gift };

      const counters = { ...gift, [counter]: gift[counter] - 1 };
      return {
        gift: await tx.gift.update({
          where: { id: gift.id },
          data: {
            [counter]: counters[counter],
            status:    deriveStatusField(counters),
          },
        }),
      };
    });

    if (!deleted) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({ success: true, gift: deleted.gift });
  } catch (error) {
    console.error('Error deleting contribution:', error);
    return NextResponse.json({ error: 'Failed to delete contribution' }, { status: 500 });
  }
}
