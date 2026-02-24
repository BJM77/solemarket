import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { jwtDecode } from 'jwt-decode';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // 1. Security Headers (Always Safe & Recommended)
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');

  // 2. Route Protection
  const session = request.cookies.get('session') || request.cookies.get('__session');
  let isAuth = false;

  if (session?.value) {
    try {
      const decoded = jwtDecode(session.value) as any;
      const currentTime = Date.now() / 1000;
      if (decoded.exp && decoded.exp > currentTime) {
        isAuth = true;
      }
    } catch (error) {
      // Invalid token
      isAuth = false;
    }
  }

  // Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!isAuth) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect Seller Routes
  if (request.nextUrl.pathname.startsWith('/sell')) {
    if (!isAuth) {
      // Allow unauthenticated access if it is just a product review page to reduce friction, 
      // but strictly protect creation/dashboard pages.
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

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
