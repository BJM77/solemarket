import { NextResponse, NextRequest } from 'next/server';
import { authAdmin } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { jwtVerify, decodeProtectedHeader, importX509 } from 'jose';

// Cache keys for the JWT verification (same as middleware)
let cachedPublicKeys: Record<string, string> | null = null;
let keysExpiry = 0;

async function getFirebasePublicKeys() {
  if (cachedPublicKeys && Date.now() < keysExpiry) {
    return cachedPublicKeys;
  }
  const res = await fetch('https://www.googleapis.com/identitytoolkit/v3/relyingparty/publicKeys', {
    next: { revalidate: 3600 }
  });
  const keys = await res.json();
  const maxAgeMatch = res.headers.get('cache-control')?.match(/max-age=(\d+)/);
  const maxAge = maxAgeMatch ? parseInt(maxAgeMatch[1], 10) * 1000 : 3600000;
  cachedPublicKeys = keys;
  keysExpiry = Date.now() + maxAge;
  return keys;
}

type AuthRole = 'user' | 'seller' | 'admin' | 'superadmin';

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    uid: string;
    email?: string;
    role: AuthRole;
  };
}

/**
 * Higher-order function to wrap API routes and enforce authentication/authorization.
 * Standardizes AuthZ across the platform.
 */
export function withAuth(
  handler: (request: AuthenticatedRequest, ...args: any[]) => Promise<NextResponse> | NextResponse,
  options: { requiredRole?: AuthRole | AuthRole[] } = {}
) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const cookieStore = await cookies();
      const session = cookieStore.get('session') || cookieStore.get('__session');
      const authHeader = request.headers.get('Authorization');
      
      let decodedToken: any = null;

      // 1. Try Session Cookie (preferred for web)
      if (session?.value) {
        const token = session.value;
        const header = decodeProtectedHeader(token);
        const publicKeys = await getFirebasePublicKeys();
        const pem = publicKeys[header.kid || ''];
        
        if (pem) {
          const publicKey = await importX509(pem, 'RS256');
          const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
          const { payload } = await jwtVerify(token, publicKey, {
            audience: projectId,
            issuer: `https://session.firebase.google.com/${projectId}`,
            algorithms: ['RS256']
          });
          decodedToken = {
            uid: payload.sub,
            email: payload.email,
            role: (payload.role as AuthRole) || 'user'
          };
        }
      } 
      // 2. Try Authorization Header (for API clients/native)
      else if (authHeader?.startsWith('Bearer ')) {
        const idToken = authHeader.split('Bearer ')[1];
        const verifiedToken = await authAdmin.verifyIdToken(idToken);
        decodedToken = {
          uid: verifiedToken.uid,
          email: verifiedToken.email,
          role: (verifiedToken.role as AuthRole) || 'user'
        };
      }

      if (!decodedToken) {
        return NextResponse.json({ error: 'Unauthorized: No valid session or token found' }, { status: 401 });
      }

      // Check Roles
      if (options.requiredRole) {
        const requiredRoles = Array.isArray(options.requiredRole) ? options.requiredRole : [options.requiredRole];
        const hasRole = requiredRoles.includes(decodedToken.role);
        
        // superadmin bypasses all role checks
        const isSuperAdmin = decodedToken.role === 'superadmin';
        
        if (!hasRole && !isSuperAdmin) {
          return NextResponse.json({ error: `Forbidden: ${requiredRoles.join(' or ')} permission required` }, { status: 403 });
        }
      }

      // Pass user data to handler
      const authRequest = request as AuthenticatedRequest;
      authRequest.user = decodedToken;

      return handler(authRequest, ...args);
    } catch (error: any) {
      console.error('[withAuth] Verification Error:', error);
      return NextResponse.json({ error: 'Unauthorized: Authentication failed' }, { status: 401 });
    }
  };
}
