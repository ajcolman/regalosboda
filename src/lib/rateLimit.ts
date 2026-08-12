/**
 * Freno de abuso por IP, en memoria del proceso.
 *
 * No es un límite estricto: Vercel puede levantar varias instancias y cada una
 * lleva su propia cuenta, así que el tope real es un múltiplo del configurado.
 * Falla siempre hacia el lado permisivo, que para este sitio es el correcto:
 * preferimos que se cuele un pedido de más antes que bloquear a un invitado que
 * está por hacernos un regalo. Un límite exacto necesitaría un almacén
 * compartido (Redis) y no se justifica acá.
 */

interface Registro {
  count: number;
  resetAt: number;
}

const CUBOS = new Map<string, Map<string, Registro>>();

/**
 * Suma un intento y responde si se pasó del tope.
 *
 * @param cubo    Espacio de nombres, para que login y reservas no se mezclen.
 * @param clave   Normalmente la IP.
 * @param maximo  Intentos permitidos dentro de la ventana.
 * @param ventana Duración de la ventana, en milisegundos.
 */
export function excedeLimite(cubo: string, clave: string, maximo: number, ventana: number) {
  const ahora = Date.now();
  let registros = CUBOS.get(cubo);
  if (!registros) {
    registros = new Map();
    CUBOS.set(cubo, registros);
  }

  // Barrido de vencidos, para que el mapa no crezca sin control.
  if (registros.size > 5000) {
    for (const [k, v] of registros) if (v.resetAt < ahora) registros.delete(k);
  }

  const previo = registros.get(clave);
  if (!previo || previo.resetAt < ahora) {
    registros.set(clave, { count: 1, resetAt: ahora + ventana });
    return false;
  }

  previo.count += 1;
  return previo.count > maximo;
}

export function limpiarLimite(cubo: string, clave: string) {
  CUBOS.get(cubo)?.delete(clave);
}

/** IP del cliente según la cabecera que pone el proxy de Vercel. */
export function ipDe(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0].trim() || 'desconocida';
}
