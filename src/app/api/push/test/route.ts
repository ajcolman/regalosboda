import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';
import { notifyAdmins } from '@/lib/push';

/** Envío de prueba, para verificar la configuración antes de la boda. */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const result = await notifyAdmins({
    title: '🔔 Prueba de notificación',
    body: 'Si ves esto, los avisos de regalos están funcionando.',
    url: '/admin',
  });

  return NextResponse.json(result);
}
