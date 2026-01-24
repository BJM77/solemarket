
import { auth } from '@/lib/firebase/admin';

/**
 * Verifies the Firebase ID token on the server side.
 * @param idToken The Firebase ID token from the client.
 * @returns The decoded token payload.
 * @throws Will throw an error if the token is invalid or verification fails.
 */
export async function verifyIdToken(idToken: string) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error: any) {
    console.error('Error verifying ID token:', error.code, error.message);

    // Check for specific error types to give better feedback in logs
    if (error.code === 'auth/id-token-expired') {
      console.error('The provided ID token has expired. Please refresh the page or re-authenticate.');
    } else if (error.code === 'auth/argument-error') {
      console.error('The ID token is missing or malformed.');
    }

    throw new Error('Invalid or expired authentication token.');
  }
}
