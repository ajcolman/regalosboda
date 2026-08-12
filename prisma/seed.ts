/**
 * Carga datos de ejemplo en una base VACÍA de desarrollo.
 *
 * ⚠ Este script es destructivo: borra todos los regalos y la configuración
 * (y, por la clave foránea en cascada, todos los aportes de los invitados).
 * Como `.env` apunta a la base de producción en Neon, correrlo sin querer
 * vaciaría la lista de regalos real. Por eso hay dos cerrojos independientes,
 * y cada uno exige un acto deliberado distinto para abrirse:
 *
 *   1. El host tiene que ser local. Cualquier otro —incluida cualquier base en
 *      Neon— se rechaza salvo que lo nombres explícitamente en
 *      SEED_ALLOW_REMOTE_HOST. No alcanza un `--force` genérico: hay que
 *      escribir el host que se va a vaciar.
 *   2. La base tiene que estar vacía. Si ya tiene datos, se aborta aunque el
 *      host sea local, salvo que agregues --force.
 *
 * Para hacer una copia antes de cualquier cosa: node prisma/backup.mjs
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Leemos el entorno igual que el resto de los scripts, para que el cerrojo mire
// exactamente la misma URL a la que se va a conectar Prisma.
config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

const HOSTS_LOCALES = ['localhost', '127.0.0.1', '::1', 'host.docker.internal'];

function abortar(motivo: string): never {
  console.error(`\n  \x1b[31mSEED CANCELADO\x1b[0m\n\n  ${motivo}\n`);
  process.exit(1);
}

function hostDe(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/** Los dos cerrojos. Corre antes de borrar nada. */
async function verificarDestino() {
  const url  = process.env.DATABASE_URL ?? '';
  const host = hostDe(url);

  if (!host) {
    abortar('No se pudo leer un host válido de DATABASE_URL.');
  }

  // Cerrojo 1: sólo bases locales, salvo permiso nominal.
  if (!HOSTS_LOCALES.includes(host) && process.env.SEED_ALLOW_REMOTE_HOST !== host) {
    abortar(
      `El seed borra TODOS los regalos, los aportes y la configuración,\n` +
      `  y "${host}" no es una base local.\n\n` +
      `  Si realmente querés vaciar esa base, nombrala de forma explícita:\n` +
      `      SEED_ALLOW_REMOTE_HOST=${host} <comando> -- --force`
    );
  }

  // Cerrojo 2: la base tiene que estar vacía.
  const [gifts, settings, contributions] = await Promise.all([
    prisma.gift.count(),
    prisma.settings.count(),
    prisma.contribution.count(),
  ]);
  const total = gifts + settings + contributions;

  if (total > 0 && !process.argv.includes('--force')) {
    abortar(
      `La base "${host}" ya tiene datos y el seed los borraría:\n` +
      `      ${gifts} regalo(s), ${contributions} aporte(s), ${settings} configuración(es).\n\n` +
      `  Hacé una copia primero:  node prisma/backup.mjs\n` +
      `  Y si estás seguro, repetí el comando con --force.`
    );
  }

  console.log(`\n  Destino: ${host}`);
  console.log(`  Estado previo: ${gifts} regalo(s), ${contributions} aporte(s), ${settings} configuración(es).`);
  if (total > 0) console.log(`  \x1b[33m--force activo: se van a borrar.\x1b[0m`);
  console.log();
}

async function main() {
  await verificarDestino();

  console.log('Seeding database...');

  // 1. Delete all existing data to start fresh (optional, but good for seeding)
  // Los aportes caen solos por la cascada de Gift, pero los borramos explícito
  // para que quede a la vista que el seed también se los lleva.
  await prisma.contribution.deleteMany({});
  await prisma.gift.deleteMany({});
  await prisma.settings.deleteMany({});

  // 2. Create Settings
  const gallery = [
    "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2069&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1537633552985-df8429e8048b?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1583939003579-730e3918a45a?q=80&w=1974&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=2070&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2070&auto=format&fit=crop"
  ];

  await prisma.settings.create({
    data: {
      coupleNames: 'Melissa & Julio',
      coverPhotoUrl: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?q=80&w=2070&auto=format&fit=crop',
      avatarPhotoUrl: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?q=80&w=2070&auto=format&fit=crop',
      bankName: 'Banco Itaú',
      bankAccount: '12345678',
      bankHolder: 'Julio Colman',
      bankDocument: '1.234.567',
      bankAlias: 'boda.melyjulio',
      galleryImages: JSON.stringify(gallery),
    }
  });

  // 3. Create Sample Gifts
  const sampleGifts = [
    {
      title: 'Luna de Miel - Cena Romántica',
      description: 'Una cena inolvidable en la playa durante nuestra luna de miel.',
      price: 500000,
      image_url: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Vuelos para Luna de Miel',
      description: 'Aporte para nuestros pasajes de avión.',
      price: 1500000,
      image_url: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop',
    },
    {
      title: 'Juego de Cubiertos Elegante',
      description: 'Para recibir a nuestras visitas en casa.',
      price: 350000,
      image_url: 'https://images.unsplash.com/photo-1585644136458-9580b0db7417?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Cafetera Espresso',
      description: 'Para nuestros desayunos juntos todas las mañanas.',
      price: 850000,
      image_url: 'https://images.unsplash.com/photo-1517246286411-8bb31b90f4d1?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Aporte para Muebles',
      description: 'Un granito de arena para equipar nuestra nueva sala.',
      price: 1000000,
      image_url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?q=80&w=2070&auto=format&fit=crop',
    },
    {
      title: 'Día de Spa para Dos',
      description: 'Un momento de relax para recuperarnos de los preparativos.',
      price: 600000,
      image_url: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=2070&auto=format&fit=crop',
    }
  ];

  for (const gift of sampleGifts) {
    await prisma.gift.create({
      data: gift
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
