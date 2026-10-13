import 'server-only';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

/**
 * Resolve the caller's uid from a Firebase ID token verified on the server.
 * Server actions must use this instead of trusting a uid sent by the browser.
 */
export async function requireUidFromToken(idToken: string | null | undefined): Promise<string> {
  if (!idToken) throw new Error('Unauthorized: please sign in.');
  const decoded = await verifyIdToken(idToken);
  if (!decoded?.uid) throw new Error('Unauthorized: please sign in.');
  return decoded.uid;
}
