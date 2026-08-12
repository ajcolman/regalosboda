import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

export default async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const autenticado = await verifySessionToken(token);
  const { pathname } = request.nextUrl;

  // Protect /admin routes except /admin/login
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!autenticado) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Redirect /admin/login to /admin if already authenticated
  if (pathname === '/admin/login' && autenticado) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/admin/:path*',
};
