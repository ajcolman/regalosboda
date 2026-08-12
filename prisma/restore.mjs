/**
 * Restaura un backup hecho con `prisma/backup.mjs`.
 *
 * Uso:
 *   node prisma/restore.mjs <archivo>            # simulacro, no escribe nada
 *   node prisma/restore.mjs <archivo> --apply    # escribe
 *
 * Restaura por upsert: vuelve a crear las filas que falten y devuelve a su
 * estado del backup las que hayan cambiado. NO borra filas creadas después del
 * backup — si querés volver exactamente al estado del backup, agregá
 * `--exacto`, que sí elimina lo que sobre.
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { readFile } from 'node:fs/promises';

config();
config({ path: '.env.local', override: true });

const ARCHIVO = process.argv[2];
const APPLY   = process.argv.includes('--apply');
const EXACTO  = process.argv.includes('--exacto');

if (!ARCHIVO || ARCHIVO.startsWith('--')) {
  console.error('\n  Falta el archivo.\n  Uso: node prisma/restore.mjs <archivo> [--apply] [--exacto]\n');
  process.exit(1);
}

const prisma = new PrismaClient();

const MODELOS = {
  Settings:         () => prisma.settings,
  PushSubscription: () => prisma.pushSubscription,
  Gift:             () => prisma.gift,
  Contribution:     () => prisma.contribution,
};

const CAMPOS_FECHA = ['createdAt', 'updatedAt'];

/** JSON guarda las fechas como texto; Prisma las quiere como Date. */
function revivir(fila) {
  const salida = { ...fila };
  for (const campo of CAMPOS_FECHA) {
    if (typeof salida[campo] === 'string') salida[campo] = new Date(salida[campo]);
  }
  return salida;
}

async function main() {
  const url  = process.env.DATABASE_URL || '';
  const host = url.match(/@([^/]+)\//)?.[1] ?? 'desconocido';

  const backup = JSON.parse(await readFile(ARCHIVO, 'utf8'));
  if (backup.formato !== 1) throw new Error(`Formato de backup desconocido: ${backup.formato}`);

  console.log(`\n  Archivo: ${ARCHIVO}`);
  console.log(`  Tomado el: ${backup.exportadoEl}  (origen: ${backup.origen})`);
  console.log(`  Destino: ${host}`);
  console.log(`  Modo: ${APPLY ? '\x1b[31mAPLICAR (escribe)\x1b[0m' : 'simulacro (no escribe)'}` +
              `${EXACTO ? '  \x1b[31m+ EXACTO (borra lo que sobre)\x1b[0m' : ''}\n`);

  // Restaurar en el orden guardado: los padres antes que los hijos.
  for (const tabla of backup.orden) {
    const filas = backup.datos[tabla] ?? [];
    const modelo = MODELOS[tabla]();

    const existentes = new Set((await modelo.findMany({ select: { id: true } })).map(r => r.id));
    const enBackup   = new Set(filas.map(f => f.id));
    const aCrear     = filas.filter(f => !existentes.has(f.id)).length;
    const aActualizar = filas.length - aCrear;
    const sobrantes  = [...existentes].filter(id => !enBackup.has(id));

    console.log(`  ${tabla.padEnd(18)} crear ${String(aCrear).padStart(3)}` +
                `   actualizar ${String(aActualizar).padStart(3)}` +
                `   sobran ${String(sobrantes.length).padStart(3)}${EXACTO ? ' (se borran)' : ' (se dejan)'}`);

    if (!APPLY) continue;

    for (const fila of filas) {
      const datos = revivir(fila);
      await modelo.upsert({ where: { id: datos.id }, create: datos, update: datos });
    }
  }

  // El borrado va al final y en orden inverso, para no chocar con las claves foráneas.
  if (APPLY && EXACTO) {
    for (const tabla of [...backup.orden].reverse()) {
      const modelo = MODELOS[tabla]();
      const enBackup = new Set((backup.datos[tabla] ?? []).map(f => f.id));
      const sobrantes = (await modelo.findMany({ select: { id: true } }))
        .map(r => r.id)
        .filter(id => !enBackup.has(id));
      if (sobrantes.length > 0) {
        await modelo.deleteMany({ where: { id: { in: sobrantes } } });
        console.log(`  ${tabla}: ${sobrantes.length} fila(s) sobrante(s) eliminadas.`);
      }
    }
  }

  console.log(APPLY
    ? '\n  Restauración aplicada.\n'
    : '\n  Simulacro: no se escribió nada. Repetí con --apply para aplicar.\n');
}

main()
  .catch((error) => {
    console.error('\n  Falló la restauración:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
