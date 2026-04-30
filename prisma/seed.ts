import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Delete all existing data to start fresh (optional, but good for seeding)
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
