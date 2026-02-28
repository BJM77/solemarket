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
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ""} https://apis.google.com https://www.googletagmanager.com https://js.stripe.com https://m.stripe.network https://cdn.jsdelivr.net https://static.cloudflareinsights.com;
    worker-src 'self' blob:;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: blob: https: *.googleapis.com *.firebasestorage.app *.firebaseapp.com;
    font-src 'self' https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    frame-src https://js.stripe.com https://hooks.stripe.com https://*.firebaseapp.com;
    connect-src 'self' https://*.googleapis.com https://firebaseremoteconfig.googleapis.com https://*.firebasestorage.app https://*.firebaseapp.com https://www.googletagmanager.com https://www.google-analytics.com https://api.stripe.com https://maps.googleapis.com blob: data:;
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  // 1. Security Headers (Always Safe & Recommended)
  requestHeaders.set('X-Frame-Options', 'DENY');
  requestHeaders.set('X-Content-Type-Options', 'nosniff');
  requestHeaders.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  requestHeaders.set('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');

  // 2. Route Protection
  const session = request.cookies.get('session') || request.cookies.get('__session');
  let isAuth = false;

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
     * - favicon.ico, sitemap.xml, robots.txt (standard SEO files)
     * - Files with extensions (static assets in public directory)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:html|txt|xml|ico|svg|jpg|jpeg|png|gif|webp|js|css|woff|woff2|ttf|otf)).*)',
  ],
};
