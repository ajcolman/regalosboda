import { NextResponse } from 'next/server';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  safeEquals,
} from '@/lib/session';
import { excedeLimite, ipDe, limpiarLimite } from '@/lib/rateLimit';

/** Probar contraseñas por HTTP no debería salir gratis. */
const MAX_INTENTOS = 10;
const VENTANA_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const ip = ipDe(request);

    if (excedeLimite('login', ip, MAX_INTENTOS, VENTANA_MS)) {
      return NextResponse.json(
        { error: 'Demasiados intentos. Esperá unos minutos.' },
        { status: 429 }
      );
    }

    const { password } = await request.json();
    const esperada = process.env.ADMIN_PASSWORD;

    if (!esperada) {
      console.error('ADMIN_PASSWORD no está configurada');
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    if (typeof password !== 'string' || !(await safeEquals(password, esperada))) {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
    }

    limpiarLimite('login', ip);

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
