/**
 * Sesión de administrador firmada.
 *
 * Antes la cookie era el texto fijo `admin_auth=authenticated`: cualquiera que
 * mandara esa cabecera entraba como administrador, y como el repositorio es
 * público el valor estaba a la vista en el código. Ahora la cookie lleva un
 * token firmado con HMAC-SHA256 y con vencimiento, que sólo puede emitir quien
 * conoce el secreto del servidor.
 *
 * Se usa Web Crypto (no `node:crypto`) para que el mismo módulo sirva tanto en
 * el proxy como en las rutas de API, sin depender del runtime de cada uno.
 *
 * El secreto sale de AUTH_SECRET, y si no está, de ADMIN_PASSWORD. Esto último
 * evita tener que configurar una variable nueva, y tiene un efecto deseable:
 * cambiar la contraseña invalida todas las sesiones abiertas.
 */

export const SESSION_COOKIE = 'admin_auth';

/** Una semana, igual que la cookie anterior. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

function secretMaterial() {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error('Falta AUTH_SECRET (o ADMIN_PASSWORD): no se puede firmar la sesión.');
  }
  return encoder.encode(secret);
}

function hmacKey(usages: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    secretMaterial(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    usages
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

/**
 * Emite un token nuevo. Formato: `<vencimiento>.<nonce>.<firma>`.
 * El nonce hace que dos sesiones emitidas en el mismo segundo no sean iguales.
 */
export async function createSessionToken(): Promise<string> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
  const nonce = toBase64Url(crypto.getRandomValues(new Uint8Array(12)));
  const payload = `${expiresAt}.${nonce}`;

  const key = await hmacKey(['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));

  return `${payload}.${toBase64Url(signature)}`;
}

/** Valida firma y vencimiento. `crypto.subtle.verify` compara en tiempo constante. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;

  const separator = token.lastIndexOf('.');
  if (separator <= 0) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    const key = await hmacKey(['verify']);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      encoder.encode(payload)
    );
    if (!valid) return false;
  } catch {
    // Firma mal formada, secreto ausente, base64 inválido: todo es "no autorizado".
    return false;
  }

  const expiresAt = Number(payload.split('.')[0]);
  return Number.isFinite(expiresAt) && expiresAt * 1000 > Date.now();
}

/**
 * Compara dos textos sin filtrar información por el tiempo que tarda.
 *
 * Compara los digest SHA-256 y no los textos: así siempre se recorren 32 bytes,
 * sin cortar en el primer carácter distinto ni delatar la longitud real.
 */
export async function safeEquals(a: string, b: string): Promise<boolean> {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(a)),
    crypto.subtle.digest('SHA-256', encoder.encode(b)),
  ]);

  const va = new Uint8Array(da);
  const vb = new Uint8Array(db);
  let diff = 0;
  for (let i = 0; i < va.length; i += 1) diff |= va[i] ^ vb[i];
  return diff === 0;
}
