/**
 * Reconstruye el detalle de aportes de los regalos que ya existían antes de la
 * tabla `Contribution`, a partir del campo `transfer_reference`.
 *
 * Ese campo guarda las confirmaciones concatenadas con el formato
 * `[Nombre] comprobante | [Nombre] comprobante`, pero no dice cuáles fueron
 * confirmadas ni cuánto transfirió cada uno. El script asume lo único razonable:
 *
 *   - las entradas están en orden cronológico, así que las primeras
 *     `timesGifted` se dan por confirmadas y las siguientes `timesPending`
 *     quedan por confirmar;
 *   - cada aporte vale el precio del regalo.
 *
 * Después del backfill hay que revisar a mano los montos reales — que es
 * justamente para lo que sirve la pantalla de aportes.
 *
 * Uso:
 *   node prisma/backfill-contributions.mjs           # simulacro, no escribe nada
 *   node prisma/backfill-contributions.mjs --apply   # escribe
 *
 * Es idempotente: saltea los regalos que ya tienen aportes registrados.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config();
config({ path: '.env.local', override: true });

const APPLY = process.argv.includes('--apply');
const prisma = new PrismaClient();

const money = (value) =>
  new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG', minimumFractionDigits: 0 })
    .format(value);

/** Separa `[Nombre] comprobante | [Nombre] comprobante` en entradas sueltas. */
function parseReferences(raw) {
  if (!raw || !raw.trim()) return [];
  return raw
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const match = part.match(/^\[(.*?)\]\s*(.*)$/);
      if (match) return { guestName: match[1].trim(), reference: match[2].trim() };
      // Entradas cargadas a mano o con otro formato: guardamos el texto crudo.
      return { guestName: '(sin nombre)', reference: part };
    });
}

async function main() {
  const url = process.env.DATABASE_URL || '';
  const host = url.match(/@([^/]+)\//)?.[1] ?? 'desconocido';

  console.log(`\n  Base de datos: ${host}`);
  console.log(`  Modo: ${APPLY ? '\x1b[31mAPLICAR (escribe en la base)\x1b[0m' : 'simulacro (no escribe)'}\n`);

  const gifts = await prisma.gift.findMany({
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { contributions: true } } },
  });

  const planned = [];
  const warnings = [];
  let skipped = 0;

  for (const gift of gifts) {
    if (gift._count.contributions > 0) { skipped += 1; continue; }

    const needed = gift.timesGifted + gift.timesPending;
    const entries = parseReferences(gift.transfer_reference);

    if (needed === 0) {
      if (entries.length > 0) {
        warnings.push(
          `"${gift.title}": tiene ${entries.length} referencia(s) pero 0 unidades ` +
          `contabilizadas (reservas rechazadas). No se crea ningún aporte.`
        );
      }
      continue;
    }

    if (entries.length > needed) {
      warnings.push(
        `"${gift.title}": ${entries.length} referencias para ${needed} unidad(es). ` +
        `Se usan las ${needed} primeras; revisá las sobrantes a mano: ` +
        entries.slice(needed).map(e => `[${e.guestName}] ${e.reference}`).join(' | ')
      );
    }

    if (entries.length < needed) {
      warnings.push(
        `"${gift.title}": ${entries.length} referencia(s) para ${needed} unidad(es). ` +
        `Se completan ${needed - entries.length} aporte(s) sin datos del invitado.`
      );
    }

    const rows = [];
    for (let i = 0; i < needed; i += 1) {
      const entry = entries[i] ?? { guestName: '(sin registro)', reference: '' };
      rows.push({
        giftId: gift.id,
        guestName: entry.guestName,
        reference: entry.reference,
        amount: gift.price,
        status: i < gift.timesGifted ? 'CONFIRMED' : 'PENDING',
      });
    }

    planned.push({ gift, rows });
  }

  for (const { gift, rows } of planned) {
    console.log(`  ${gift.title} — ${money(gift.price)} c/u`);
    for (const row of rows) {
      const label = row.status === 'CONFIRMED' ? 'confirmado' : 'pendiente ';
      console.log(`      ${label}  ${money(row.amount)}  ${row.guestName}  ${row.reference}`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n  Avisos:');
    for (const warning of warnings) console.log(`    ! ${warning}`);
  }

  const totalRows = planned.reduce((sum, p) => sum + p.rows.length, 0);
  console.log(
    `\n  ${totalRows} aporte(s) a crear en ${planned.length} regalo(s). ` +
    `${skipped} regalo(s) ya tenían detalle y se saltearon.`
  );

  if (!APPLY) {
    console.log('\n  Simulacro: no se escribió nada. Repetí con --apply para aplicar.\n');
    return;
  }

  if (totalRows === 0) {
    console.log('\n  Nada que hacer.\n');
    return;
  }

  // Una transacción por regalo, y re-chequeando adentro que siga sin aportes,
  // para que dos corridas simultáneas no dupliquen el detalle.
  let created = 0;
  for (const { gift, rows } of planned) {
    created += await prisma.$transaction(async (tx) => {
      const existing = await tx.contribution.count({ where: { giftId: gift.id } });
      if (existing > 0) return 0;
      const result = await tx.contribution.createMany({ data: rows });
      return result.count;
    });
  }

  console.log(`\n  Listo: ${created} aporte(s) creados.\n`);
}

main()
  .catch((error) => {
    console.error('\n  Falló el backfill:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
