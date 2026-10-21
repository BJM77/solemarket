'use client';
/**
 * Lazy access to the Firebase client SDK.
 *
 * Public pages (home, listings, product pages) must not ship Firestore/Auth/Storage
 * in their initial JavaScript. Everything that only needs Firebase after first
 * paint goes through loadFirebase(), which pulls the SDK in a separate chunk.
 * Routes that need Firebase immediately (sign-in, sell, admin, AutoCard) still
 * import '@/lib/firebase/config' directly, so this resolves instantly there.
 *
 * This file must only use `import type` from firebase packages.
 */
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

export type FirestoreModule = typeof import('firebase/firestore');
export type AuthModule = typeof import('firebase/auth');

export interface LoadedFirebase {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth | undefined;
  fs: FirestoreModule;
  authSdk: AuthModule;
}

let promise: Promise<LoadedFirebase> | null = null;
let loaded: LoadedFirebase | null = null;

export function loadFirebase(): Promise<LoadedFirebase> {
  if (!promise) {
    promise = Promise.all([
      import('./config'),
      import('firebase/firestore'),
      import('firebase/auth'),
    ]).then(([config, fs, authSdk]) => {
      loaded = { app: config.app, db: config.db, auth: config.auth, fs, authSdk };
      return loaded;
    });
    promise.catch(() => { promise = null; });
  }
  return promise;
}

/** The SDK if it has already loaded, else null (never triggers a load). */
export function getLoadedFirebase(): LoadedFirebase | null {
  return loaded;
}

/** Same as getCurrentUserIdToken in ./auth, without pulling the auth SDK up front. */
export async function getIdTokenLazy(): Promise<string | null> {
  const { getCurrentUserIdToken } = await import('./auth');
  return getCurrentUserIdToken();
}

export async function signOutLazy(): Promise<void> {
  const { signOutUser } = await import('./auth');
  await signOutUser();
}
