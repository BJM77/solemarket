
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'
import type { SafeUser } from './auth/use-user';
import { app, auth as authInstance, db } from '@/lib/firebase/config';
import { SUPER_ADMIN_EMAILS } from '@/lib/constants';

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

      const oneTimeSetup = async (user: User) => {
        try {
          console.log("[Setup] Starting one-time setup for user:", user.uid);
          
          // Identify super admin by UID or email list
          const isSuperAdminUser = user.uid === 'O5nCLgbIaRRRF369K0kjgT59io73' || (user.email && SUPER_ADMIN_EMAILS.includes(user.email));
          
          if (isSuperAdminUser) {
            console.log("[Setup] User identified as Super Admin.");
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists() && !userSnap.data().isAdmin) {
              console.log("[Setup] Updating existing user profile with admin flag...");
              await setDoc(userRef, { isAdmin: true }, { merge: true });
              console.log("[Setup] Admin flag set.");
            } else if (!userSnap.exists()) {
              console.log("[Setup] Creating new super admin profile...");
              await setDoc(userRef, {
                email: user.email,
                displayName: user.displayName || 'Super Admin',
                isAdmin: true,
                createdAt: new Date(),
              }, { merge: true });
              console.log("[Setup] Super admin profile created.");
            }

            console.log("[Setup] Checking platform stats...");
            const statsRef = doc(db, 'platform_stats', 'global');
            try {
              const statsSnap = await getDoc(statsRef);
              if (!statsSnap.exists()) {
                console.log("[Setup] Initializing platform stats...");
                await setDoc(statsRef, {
                  totalRevenue: 0,
                  activeSellers: 0,
                  disputeCount: 0,
                  totalItems: 0,
                });
                console.log("[Setup] Platform stats initialized.");
              }
            } catch (statsErr) {
              console.warn("[Setup] Optional: Platform stats check failed (likely permissions):", statsErr);
            }
          }
          console.log("[Setup] Setup process complete.");
        } catch (error) {
          console.error("[Setup] Critical setup error:", error);
        }
      };


      const unsubscribe = onAuthStateChanged(
        authService,
        (firebaseUser) => { // Raw Firebase user
          if (firebaseUser) {
            oneTimeSetup(firebaseUser).catch(console.error);
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
