import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAdmin } from '@/lib/adminAuth';

/** Registra el dispositivo actual para recibir avisos de regalos nuevos. */
export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;

    if (typeof endpoint !== 'string' || !p256dh || !auth) {
      return NextResponse.json({ error: 'INVALID_SUBSCRIPTION' }, { status: 400 });
    }

    const label = typeof body.label === 'string' && body.label.trim()
      ? body.label.trim().slice(0, 80)
      : null;

    // Re-suscribirse en el mismo dispositivo reemplaza las claves en lugar de duplicar.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: { p256dh, auth, ...(label ? { label } : {}) },
      create: { endpoint, p256dh, auth, label },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}

/** Da de baja el dispositivo actual. */
export async function DELETE(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();
    if (typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'INVALID_ENDPOINT' }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Failed to delete subscription' }, { status: 500 });
  }
}
