
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import type { SafeUser } from './auth/use-user';
import { app, auth as authInstance, db } from '@/lib/firebase/config';
import { SUPER_ADMIN_EMAILS, SUPER_ADMIN_UIDS } from '@/lib/constants';
import { syncUserOnLogin } from '@/app/actions/auth';

/**
 * Creates a plain, serializable object from a Firebase User object.
 * This prevents passing complex, circular objects into React state.
 * @param user The raw Firebase User object.
 * @returns A "safe" user object with only primitive values, or null.
 */
function getSafeUser(user: User | null): SafeUser {
  if (!user) {
    return null;
  }
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
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
}

// Return type for useFirebase()
export interface FirebaseServicesAndUser {
  firebaseApp: FirebaseApp | null; // Can be null on server
  firestore: Firestore | null; // Can be null on server
  auth: Auth | null; // Can be null on server
  user: SafeUser;
  isUserLoading: boolean;
  userError: Error | null;
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
    });

    const authService = typeof window !== 'undefined' ? authInstance : null;

    // Effect to subscribe to Firebase auth state changes
    useEffect(() => {
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
              const token = await firebaseUser.getIdToken();
              // 1. Sync Session Cookie
              await fetch("/api/auth/session", {
                method: "POST",
                body: JSON.stringify({ idToken: token }),
              });

              // 2. Sync User Data (Server Action)
              // Dynamically import to avoid server-action-in-client-component issues if not carefully handled, 
              // though importing server action in client component IS allowed in Next.js.
              // We'll use the imported function.
              await syncUserOnLogin(token);

            } catch (err) {
              console.error("Failed to sync session/user:", err);
            }
          } else {
            // Clear session cookie
            await fetch("/api/auth/session", { method: "DELETE" });
          }
          setUserAuthState({ user: getSafeUser(firebaseUser), isUserLoading: false, userError: null });
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
