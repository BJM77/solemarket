import { authAdmin } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export type AuthRole = 'user' | 'seller' | 'admin' | 'superadmin';

export interface AuthContext {
    uid: string;
    email?: string;
    name?: string;
    role: AuthRole;
}

/**
 * Standardizes Authorization for Server Actions.
 * Checks for a valid ID token (provided as an argument) or a session cookie.
 */
export async function ensureActionAuth(idToken?: string, requiredRole?: AuthRole | AuthRole[]): Promise<AuthContext> {
    let decodedToken: any = null;

    // 1. Try provided ID Token (common for actions triggered by client interactions)
    if (idToken) {
        try {
            decodedToken = await verifyIdToken(idToken);
        } catch (err) {
            console.error('[ensureActionAuth] ID Token verification failed:', err);
        }
    }

    // 2. Fallback to Session Cookie (if no token provided or verification failed)
    if (!decodedToken) {
        try {
            const cookieStore = await cookies();
            const session = cookieStore.get('session') || cookieStore.get('__session');
            if (session?.value) {
                // For actions, we use the Admin SDK to verify the session if needed, 
                // but verifyIdToken is often sufficient if we pass it.
                // However, session cookies are verified differently.
                // For now, we prioritize the ID Token provided by the client's current session.
                throw new Error('Session cookie handling for actions requires ID Token provided as argument.');
            }
        } catch (e) {
            // No cookie or failed
        }
    }

    if (!decodedToken) {
        throw new Error('Unauthorized: Authentication required.');
    }

    const { uid, email, role = 'user', name } = decodedToken;

    // 3. Role Check
    if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        const hasRole = roles.includes(role as AuthRole) || role === 'superadmin';

        if (!hasRole) {
            throw new Error(`Forbidden: ${roles.join(' or ')} role required.`);
        }
    }

    return {
        uid,
        email,
        name,
        role: role as AuthRole
    };
}
