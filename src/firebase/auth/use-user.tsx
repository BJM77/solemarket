
'use client';

import { useFirebase } from '@/firebase/provider';
import type { User as FirebaseUser } from 'firebase/auth';

// Define the shape of the safe, plain user object
export type SafeUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Add the getIdTokenResult method for custom claims
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: { [key: string]: any; }; }>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
} | null;


// Return type for useUser()
export interface UserHookResult {
  user: SafeUser;
  isUserLoading: boolean;
  userError: Error | null;
}


/**
 * Hook specifically for accessing the authenticated user's state.
 * This provides the User object, loading status, and any auth errors.
 * @returns {UserHookResult} Object with user, isUserLoading, userError.
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
