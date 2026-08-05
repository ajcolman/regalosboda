'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from '@/app/admin/admin.module.css';

type State =
  | 'loading'
  | 'unsupported'      // El navegador no soporta Web Push.
  | 'ios-needs-install' // iPhone/iPad: hay que instalar el sitio primero.
  | 'denied'           // El usuario bloqueó los permisos.
  | 'off'
  | 'on';

/** El applicationServerKey va como bytes, no como el base64url que guardamos. */
function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIOS() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS se declara como Mac; se distingue por el soporte táctil.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Nombre legible para distinguir los dispositivos en la base. */
function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Otro dispositivo';
}

export default function PushNotifications() {
  const [state, setState] = useState<State>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;

      if (!supported) {
        // En iOS el push existe sólo dentro de la app instalada, así que la
        // falta de soporte ahí es un paso pendiente, no un callejón sin salida.
        if (!cancelled) setState(isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported');
        return;
      }

      if (Notification.permission === 'denied') {
        if (!cancelled) setState('denied');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        const existing = await registration.pushManager.getSubscription();
        if (!cancelled) setState(existing ? 'on' : 'off');
      } catch (error) {
        console.error('No se pudo registrar el service worker:', error);
        if (!cancelled) setState('unsupported');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const enable = useCallback(async () => {
    if (!vapidKey) {
      setMessage('Falta configurar la clave pública VAPID en el servidor.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Safari exige que esto salga de un gesto del usuario: por eso va en el onClick.
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: subscription.toJSON(), label: deviceLabel() }),
      });

      if (!res.ok) {
        // Si el servidor no la guardó, no dejamos una suscripción huérfana en el navegador.
        await subscription.unsubscribe();
        setMessage('No se pudo guardar la suscripción. Intentá de nuevo.');
        setState('off');
        return;
      }

      setState('on');
      setMessage('Listo, este dispositivo va a recibir los avisos.');
    } catch (error) {
      console.error('Error activando notificaciones:', error);
      setMessage('No se pudieron activar las notificaciones en este dispositivo.');
    } finally {
      setBusy(false);
    }
  }, [vapidKey]);

  const disable = useCallback(async () => {
    setBusy(true);
    setMessage('');

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setState('off');
      setMessage('Este dispositivo ya no va a recibir avisos.');
    } catch (error) {
      console.error('Error desactivando notificaciones:', error);
      setMessage('No se pudo desactivar. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  }, []);

  const sendTest = useCallback(async () => {
    setBusy(true);
    setMessage('');

    try {
      const res = await fetch('/api/push/test', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setMessage('No se pudo enviar la prueba.');
      } else if (data.sent > 0) {
        setMessage(
          `Prueba enviada a ${data.sent} dispositivo${data.sent === 1 ? '' : 's'}` +
          `${data.failed ? ` (${data.failed} sin respuesta)` : ''}.`
        );
      } else {
        setMessage('No hay dispositivos registrados para recibir avisos.');
      }
    } catch {
      setMessage('Error de conexión al enviar la prueba.');
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <h3 className={styles.cardTitle}>Avisos de Regalos</h3>
        </div>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.csvHint} style={{ marginBottom: '1rem' }}>
          Recibí una notificación en este dispositivo cada vez que alguien confirma un regalo.
          Se activa por separado en cada teléfono o computadora.
        </p>

        {state === 'loading' && (
          <p className={styles.csvHint}>Verificando este dispositivo…</p>
        )}

        {state === 'unsupported' && (
          <p className={styles.pushWarn}>
            Este navegador no soporta notificaciones push. Probá con Chrome en Android,
            o con Safari en iPhone agregando el sitio a la pantalla de inicio.
          </p>
        )}

        {state === 'ios-needs-install' && (
          <div className={styles.pushWarn}>
            <strong>En iPhone o iPad hay un paso previo.</strong> Apple sólo permite
            notificaciones si el sitio está instalado:
            <ol className={styles.pushSteps}>
              <li>Abrí este sitio en <strong>Safari</strong> (no funciona desde Chrome en iOS).</li>
              <li>Tocá el botón <strong>Compartir</strong> ⎋ abajo en el centro.</li>
              <li>Elegí <strong>Agregar a pantalla de inicio</strong>.</li>
              <li>Abrí la app desde el ícono nuevo, entrá acá y activá los avisos.</li>
            </ol>
          </div>
        )}

        {state === 'denied' && (
          <p className={styles.pushWarn}>
            Bloqueaste las notificaciones para este sitio. Para volver a habilitarlas
            entrá a los ajustes del navegador, buscá los permisos de este sitio y
            permití las notificaciones. Después recargá esta página.
          </p>
        )}

        {state === 'off' && (
          <button className={styles.btnSave} onClick={enable} disabled={busy}>
            {busy ? 'Activando…' : 'Activar notificaciones'}
          </button>
        )}

        {state === 'on' && (
          <>
            <p className={styles.pushOk}>
              <span className={styles.statusDot} /> Activadas en este dispositivo
            </p>
            <div className={styles.pushActions}>
              <button className={styles.btnOutline} onClick={sendTest} disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar prueba'}
              </button>
              <button className={styles.btnGhost} onClick={disable} disabled={busy}>
                Desactivar
              </button>
            </div>
          </>
        )}

        {message && <p className={styles.pushMessage}>{message}</p>}
      </div>
    </div>
  );
}
