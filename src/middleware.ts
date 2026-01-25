import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Security Headers (Always Safe & Recommended)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');

  // 2. Route Protection (Requires Cookie Sync)
  // Since we are currently using client-side Firebase Auth, the server doesn't see the user's token by default.
  // To enable the blocking logic below, you must implement a mechanism to sync the Fireabse ID token to a 'session' cookie.

  /* 
  const session = request.cookies.get('session') || request.cookies.get('__session');
  const isAuth = !!session;
 
  // Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAuth) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }
 
  // Protect Seller Routes
  if (request.nextUrl.pathname.startsWith('/sell')) {
    if (!isAuth) {
       return NextResponse.redirect(new URL('/sign-in', request.url));
    }
  }
  */

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
