import { prisma } from '@/lib/prisma';
import AdminClient from './AdminClient';

export const revalidate = 0;

export default async function AdminPage() {
  const gifts = await prisma.gift.findMany({
    orderBy: { createdAt: 'desc' }
  });

  let settings = await prisma.settings.findFirst();
  if (!settings) {
    settings = await prisma.settings.create({
      data: {}
    });
  }

  return <AdminClient initialGifts={gifts} initialSettings={settings} />;
}
