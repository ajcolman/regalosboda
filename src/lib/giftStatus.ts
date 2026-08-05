/**
 * Fuente de verdad única para la disponibilidad de un regalo.
 *
 * La columna `status` del modelo es legacy: se mantiene sincronizada (siempre
 * derivada desde el servidor) sólo por compatibilidad, pero nunca debe usarse
 * para decidir si un regalo se puede seguir regalando — para eso están los
 * contadores de stock.
 */

export interface GiftCounters {
  stock: number;
  timesGifted: number;
  timesPending: number;
}

export type GiftStatusType = 'available' | 'reserved' | 'gifted';

export function getGiftStatus(gift: GiftCounters): { text: string; type: GiftStatusType } {
  if (gift.timesGifted >= gift.stock)
    return { text: 'Regalado', type: 'gifted' };
  if (gift.timesGifted + gift.timesPending >= gift.stock)
    return { text: 'Reservado', type: 'reserved' };
  return { text: 'Disponible', type: 'available' };
}

export function isGiftAvailable(gift: GiftCounters) {
  return getGiftStatus(gift).type === 'available';
}

/** Valor de la columna legacy `status`, derivado de los contadores. */
export function deriveStatusField(gift: GiftCounters) {
  switch (getGiftStatus(gift).type) {
    case 'gifted':   return 'GIFTED';
    case 'reserved': return 'PENDING_CONFIRMATION';
    default:         return 'AVAILABLE';
  }
}
