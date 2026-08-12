/**
 * Backup completo de la base a un archivo JSON. SÓLO LECTURA sobre la base.
 *
 * Uso:
 *   node prisma/backup.mjs                    # escribe en ~/backups/julio/
 *   node prisma/backup.mjs /otra/ruta.json    # destino explícito
 *
 * El archivo NO va al repositorio: contiene nombres de invitados, números de
 * comprobante y las claves de las suscripciones push. Por eso el destino por
 * defecto está fuera del proyecto.
 *
 * Para restaurarlo: node prisma/restore.mjs <archivo>
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

// El orden importa para restaurar: Gift antes que Contribution, que la referencia.
const TABLAS = ['Settings', 'PushSubscription', 'Gift', 'Contribution'];

const LECTORES = {
  Settings:         () => prisma.settings.findMany({ orderBy: { id: 'asc' } }),
  PushSubscription: () => prisma.pushSubscription.findMany({ orderBy: { id: 'asc' } }),
  Gift:             () => prisma.gift.findMany({ orderBy: { id: 'asc' } }),
  Contribution:     () => prisma.contribution.findMany({ orderBy: { id: 'asc' } }),
};

async function main() {
  const url  = process.env.DATABASE_URL || '';
  const host = url.match(/@([^/]+)\//)?.[1] ?? 'desconocido';

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const destino = process.argv[2]
    ?? path.join(homedir(), 'backups', 'julio', `julio-${stamp}.json`);

  console.log(`\n  Origen:  ${host}`);
  console.log(`  Destino: ${destino}\n`);

  const datos = {};
  for (const tabla of TABLAS) {
    datos[tabla] = await LECTORES[tabla]();
    console.log(`  ${tabla.padEnd(18)} ${String(datos[tabla].length).padStart(4)} fila(s)`);
  }

  const contenido = {
    formato: 1,
    exportadoEl: new Date().toISOString(),
    origen: host,
    orden: TABLAS,
    datos,
  };

  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, JSON.stringify(contenido, null, 2), 'utf8');

  const total = TABLAS.reduce((s, t) => s + datos[t].length, 0);
  console.log(`\n  Listo: ${total} fila(s) guardadas.`);
  console.log(`  Restaurar con: node prisma/restore.mjs ${destino}\n`);
}

main()
  .catch((error) => {
    console.error('\n  Falló el backup:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
