
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import type { SafeUser } from './auth/use-user';
import { app, auth as authInstance, db } from '@/lib/firebase/config';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { syncUserOnLogin } from '@/app/actions/auth/auth';

/**
 * Creates a plain, serializable object from a Firebase User object.
 * This prevents passing complex, circular objects into React state.
 * @param user The raw Firebase User object.
 * @returns A "safe" user object with only primitive values, or null.
 */
function getSafeUser(user: User | null, role?: string): SafeUser {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
    role: role,
    // Pass the function reference, it will be called in components
    getIdTokenResult: (forceRefresh?: boolean) => user.getIdTokenResult(forceRefresh),
    getIdToken: (forceRefresh?: boolean) => user.getIdToken(forceRefresh),
  };
}

// Internal state for user authentication, using the SafeUser type
interface UserAuthState {
  user: SafeUser;
  isUserLoading: boolean;
  userError: Error | null;
  role?: string;
}

// Combined state for the Firebase context
export interface FirebaseContextState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
  // User authentication state now uses SafeUser
  user: SafeUser;
  isUserLoading: boolean;
  userError: Error | null;
  role?: string;
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp | null; // Can be null on server
  firestore: Firestore | null; // Can be null on server
  auth: Auth | null; // Can be null on server
  user: SafeUser;
  isUserLoading: boolean;
  userError: Error | null;
  role?: string;
}

// React Context
export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

/**
 * FirebaseProvider manages and provides Firebase services and user authentication state.
 */
export const FirebaseProvider: React.FC<{
  children: ReactNode;
}> = ({
  children,
}) => {
    const [userAuthState, setUserAuthState] = useState<UserAuthState>({
      user: null,
      isUserLoading: true,
      userError: null,
      role: undefined
    });

    const authService = typeof window !== 'undefined' ? authInstance : null;

    // Effect to subscribe to Firebase auth state changes
    useEffect(() => {
      // DEV MOCK: Automatically sign in a mock user in development if not already signed in
      if (process.env.NODE_ENV === 'development' && !authService) {
        console.log('🧪 DEV MOCK: Injecting mock user for testing');
        setUserAuthState({
          user: {
            uid: 'dev-mock-user',
            email: 'dev@example.com',
            displayName: 'Dev User',
            photoURL: null,
            emailVerified: true,
            getIdTokenResult: async () => ({ claims: { role: 'admin' } } as any),
            getIdToken: async () => 'dev-mock-token',
          },
          isUserLoading: false,
          userError: null,
          role: 'admin'
        });
        return;
      }

      if (!authService) {
        setTimeout(() => {
          setUserAuthState({ user: null, isUserLoading: false, userError: null });
        }, 0);
        return;
      }

      const unsubscribe = onAuthStateChanged(
        authService,
        async (firebaseUser) => { // Raw Firebase user
          if (firebaseUser) {
            try {
              const tokenResult = await firebaseUser.getIdTokenResult();
              const role = tokenResult.claims.role as string;
              
              // Optimistic update with role
              const safeUser = getSafeUser(firebaseUser, role);
              setUserAuthState({ user: safeUser, isUserLoading: false, userError: null, role });

              const token = await firebaseUser.getIdToken();
              // 1. Sync Session Cookie
              await fetch("/api/auth/session", {
                method: "POST",
                body: JSON.stringify({ idToken: token }),
              });

              // 2. Sync User Data (Server Action)
              await syncUserOnLogin(token);

            } catch (err) {
              console.error("Failed to sync session/user:", err);
              // Fallback to basic safe user without role if claim fetch fails
              setUserAuthState({ user: getSafeUser(firebaseUser), isUserLoading: false, userError: null });
            }
          } else {
            // Logged out
            setUserAuthState({ user: null, isUserLoading: false, userError: null, role: undefined });
            // Cleanup session cookie in background
            fetch("/api/auth/session", { method: "DELETE" }).catch(() => { });
          }
        },

        (error) => {
          console.error("FirebaseProvider: onAuthStateChanged error:", error);
          setUserAuthState({ user: null, isUserLoading: false, userError: error });
        }
      );

      return () => unsubscribe(); // Cleanup
    }, [authService]);

    // Memoize the context value
    const contextValue = useMemo((): FirebaseContextState => {
      const servicesAvailable = !!(app && db && authInstance);
      return {
        areServicesAvailable: servicesAvailable,
        firebaseApp: servicesAvailable ? app : null,
        firestore: servicesAvailable ? db : null,
        auth: servicesAvailable ? authInstance : null,
        user: userAuthState.user,
        isUserLoading: userAuthState.isUserLoading,
        userError: userAuthState.userError,
        role: userAuthState.role,
      };
    }, [userAuthState]);

    return (
      <FirebaseContext.Provider value={contextValue}>
        <FirebaseErrorListener />
        {children}
      </FirebaseContext.Provider>
    );
  };


/**
 * Hook to access core Firebase services and user authentication state.
 * Throws error if core services are not available or used outside provider.
 */
export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);

  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider.');
  }

  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
    role: context.role,
  };
};

/** Hook to access Firebase Auth instance. */
export const useAuth = (): Auth | null => {
  const { auth } = useFirebase();
  return auth;
};

/** Hook to access Firestore instance. */
export const useFirestore = (): Firestore | null => {
  const { firestore } = useFirebase();
  return firestore;
};

/** Hook to access Firebase App instance. */
export const useFirebaseApp = (): FirebaseApp | null => {
  const { firebaseApp } = useFirebase();
  return firebaseApp;
};
