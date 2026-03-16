import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { jwtVerify, decodeProtectedHeader, importX509 } from 'jose';

// Cache keys in memory during Edge function execution
let cachedPublicKeys: Record<string, string> | null = null;
let keysExpiry = 0;

async function getFirebasePublicKeys() {
  if (cachedPublicKeys && Date.now() < keysExpiry) {
    return cachedPublicKeys;
  }
  const res = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys', {
    next: { revalidate: 3600 } // Cache for 1 hour
  });
  const keys = await res.json();
  const maxAgeMatch = res.headers.get('cache-control')?.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600000;

  cachedPublicKeys = keys;
  keysExpiry = Date.now() + maxAge;
  return keys;
}

export async function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === 'development';

  // Generate nonce for CSP
  const nonce = crypto.randomUUID();

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://apis.google.com https://www.googletagmanager.com https://js.stripe.com https://m.stripe.network https://cdn.jsdelivr.net https://static.cloudflareinsights.com https://connect.facebook.net;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https: *.googleapis.com *.firebasestorage.app *.firebaseapp.com https://www.facebook.com *.unsplash.com;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://www.facebook.com;
    frame-ancestors 'none';
    frame-src https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com https://www.facebook.com;
    connect-src 'self' https://*.googleapis.com https://firebaseremoteconfig.googleapis.com https://*.firebasestorage.app https://*.firebaseapp.com https://www.googletagmanager.com https://www.google-analytics.com https://api.stripe.com https://maps.googleapis.com https://*.facebook.com blob: data:;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', cspHeader);
  requestHeaders.set('x-nonce', nonce); // Pass nonce to Next.js

  // 1. Security Headers (Always Safe & Recommended)
  requestHeaders.set('X-Frame-Options', 'DENY');
  requestHeaders.set('X-Content-Type-Options', 'nosniff');
  requestHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  requestHeaders.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  // 1. Critical Bypass: Allow internal Next.js and all static files to pass through instantly.
  // This prevents MIME-type errors and ChunkLoadErrors during development.
  const isStaticFile = request.nextUrl.pathname.includes('.') || 
                       request.nextUrl.pathname.startsWith('/_next');
  
  if (isStaticFile || request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');

  // 1.5. SEO Rules (Noindex parametric search pages to prevent crawl bloat)
  const searchParams = request.nextUrl.searchParams;
  const hasFilterParams = ['price', 'size', 'condition', 'brand', 'model', 'sort', 'colorway'].some(param => searchParams.has(param));
  if (hasFilterParams) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // 2. Route Protection
  const session = request.cookies.get('session') || request.cookies.get('__session');
  let isAuth = false;
  let userRole = 'user';

  if (session?.value) {
    try {
      const token = session.value;
      const header = decodeProtectedHeader(token);

      if (header.kid) {
        const publicKeys = await getFirebasePublicKeys();
        const pem = publicKeys[header.kid];

        if (pem) {
          const publicKey = await importX509(pem, 'RS256');

          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
          const { payload } = await jwtVerify(token, publicKey, {
            audience: projectId,
            issuer: `https://session.firebase.google.com/${projectId}`,
            algorithms: ['RS256']
          });

          // Token is cryptographically verified
          const currentTime = Date.now() / 1000;
          if (payload.exp && payload.exp > currentTime) {
            isAuth = true;
            userRole = (payload.role as string) || 'user';
          }
        }
      }
    } catch (error) {
      console.warn("Middleware Auth Verification Failed:", error);
      isAuth = false;
    }
  }

  // Protect Admin Routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const isAdmin = isAuth && (userRole === 'admin' || userRole === 'superadmin');
    if (!isAdmin) {
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Protect Seller Routes
  if (request.nextUrl.pathname.startsWith('/sell')) {
    if (!isAuth) {
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
     * - favicon.ico, sitemap.xml, robots.txt (standard SEO files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
