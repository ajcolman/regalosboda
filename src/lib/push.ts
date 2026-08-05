import webpush from 'web-push';
import { prisma } from './prisma';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured = false;

function configure() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;

  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
      publicKey,
      privateKey
    );
    configured = true;
  }
  return true;
}

/**
 * Envía un aviso a todos los dispositivos registrados.
 *
 * Nunca lanza: un fallo del servicio de push no debe romper la operación que
 * lo disparó (por ejemplo, la confirmación de un regalo). Las suscripciones que
 * el navegador ya dio de baja (404/410) se borran solas.
 *
 * Devuelve cuántas salieron bien, para poder mostrarlo en el panel.
 */
export async function notifyAdmins(payload: PushPayload): Promise<{ sent: number; failed: number }> {
  if (!configure()) {
    console.warn('Web Push sin configurar: faltan las claves VAPID.');
    return { sent: 0, failed: 0 };
  }

  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return { sent: 0, failed: 0 };

  const data = JSON.stringify({ ...payload, timestamp: Date.now() });
  const stale: string[] = [];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async sub => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          data,
          { TTL: 60 * 60 * 24 }
        );
        sent++;
      } catch (error) {
        failed++;
        const status = (error as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          stale.push(sub.endpoint);
        } else {
          console.error('Push fallido:', status, (error as { body?: string })?.body);
        }
      }
    })
  );

  if (stale.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: stale } } });
  }

  return { sent, failed };
}
