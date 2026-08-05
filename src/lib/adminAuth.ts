import { cookies } from 'next/headers';

/**
 * El proxy (`src/proxy.ts`) sólo cubre `/admin/:path*`, así que las rutas de
 * API quedan fuera de su matcher y tienen que validar la sesión por su cuenta.
 */
export async function isAdmin() {
  const cookieStore = await cookies();
  return cookieStore.get('admin_auth')?.value === 'authenticated';
}
