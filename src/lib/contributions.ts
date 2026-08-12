/**
 * Aportes individuales de los invitados.
 *
 * La disponibilidad de un regalo la siguen decidiendo los contadores
 * (`timesGifted` / `timesPending`) — ver `giftStatus.ts`. Esta tabla es el
 * detalle de quién puso cuánto, y existe para poder rectificar el monto de una
 * persona sin afectar a las demás.
 *
 * Invariante: cada aporte vivo consume una unidad del regalo. Un aporte
 * CONFIRMED equivale a +1 en `timesGifted`; uno PENDING, a +1 en `timesPending`.
 * Por eso todo cambio de estado se aplica como delta sobre los contadores y
 * nunca recalculando desde cero: los regalos que vienen de antes de esta tabla
 * pueden tener contadores sin aportes que los respalden, y un recálculo los
 * pondría en cero.
 */

export type ContributionStatus = 'PENDING' | 'CONFIRMED';

export interface ContributionRecord {
  id: string;
  giftId: string;
  guestName: string;
  reference: string;
  amount: number;
  status: string;
  createdAt: Date | string;
}

export function isContributionStatus(value: unknown): value is ContributionStatus {
  return value === 'PENDING' || value === 'CONFIRMED';
}

/** Contador del regalo al que le suma/resta un aporte con este estado. */
export function counterFor(status: ContributionStatus): 'timesGifted' | 'timesPending' {
  return status === 'CONFIRMED' ? 'timesGifted' : 'timesPending';
}

export function translateContributionStatus(status: string) {
  switch (status) {
    case 'CONFIRMED': return 'Confirmado';
    case 'PENDING':   return 'Por confirmar';
    default:          return status;
  }
}

/** Suma de los montos ya confirmados. */
export function confirmedAmount(contributions: ContributionRecord[]) {
  return contributions
    .filter(c => c.status === 'CONFIRMED')
    .reduce((total, c) => total + c.amount, 0);
}

/** Suma de los montos que todavía esperan confirmación. */
export function pendingAmount(contributions: ContributionRecord[]) {
  return contributions
    .filter(c => c.status === 'PENDING')
    .reduce((total, c) => total + c.amount, 0);
}

/**
 * Cuánto se recibió realmente por un regalo.
 *
 * Si el detalle de aportes cubre todas las unidades contabilizadas usamos los
 * montos reales — que es el punto de poder rectificarlos. Si el regalo viene de
 * antes de que existiera esta tabla y le faltan aportes, caemos a la estimación
 * histórica (precio × unidades) para no reportar de menos.
 */
export function amountFor(
  gift: { price: number; timesGifted: number; timesPending: number },
  contributions: ContributionRecord[]
) {
  const confirmed = contributions.filter(c => c.status === 'CONFIRMED');
  const pending   = contributions.filter(c => c.status === 'PENDING');

  return {
    received: confirmed.length === gift.timesGifted
      ? confirmedAmount(contributions)
      : gift.price * gift.timesGifted,
    pending: pending.length === gift.timesPending
      ? pendingAmount(contributions)
      : gift.price * gift.timesPending,
    /** true si los contadores y el detalle no coinciden: el total es estimado. */
    estimated:
      confirmed.length !== gift.timesGifted || pending.length !== gift.timesPending,
  };
}
