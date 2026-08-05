import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import GiftDetailClient from './GiftDetailClient';
import Link from 'next/link';
import { isGiftAvailable } from '@/lib/giftStatus';

export const revalidate = 0;

export default async function GiftPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const gift = await prisma.gift.findUnique({
    where: { id: resolvedParams.id }
  });

  if (!gift) {
    notFound();
  }

  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({ data: {} });
  }

  if (!isGiftAvailable(gift)) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem' }}>
          Este regalo ya no está disponible
        </h1>
        <p style={{ color: '#555', marginBottom: '2rem' }}>
          Alguien más ya ha reservado o regalado este detalle. ¡Agradecemos muchísimo tu intención!
        </p>
        <Link href="/" className="btn-primary">
          Ver otros regalos
        </Link>
      </div>
    );
  }

  return <GiftDetailClient gift={gift} settings={settings} />;
}
