'use client';

// This file is the main entry point for all client-side Firebase functionality.
// It re-exports the necessary providers, hooks, and utilities.

import { useMemo, useContext, type DependencyList } from 'react';
import { FirebaseContext } from './provider';
import type { LoadedFirebase } from '@/lib/firebase/lazy';

/**
 * A custom hook that wraps React's `useMemo` to stabilize Firestore query/document references.
 * It adds a `__memo` property to the returned value, which is checked by `useCollection` and `useDoc`
 * to ensure that query objects are not recreated on every render, preventing infinite loops.
 *
 * @param factory A function that creates the Firestore query or document reference.
 * @param deps An array of dependencies for the `useMemo` hook.
 * @returns The memoized value from the factory function, with an added `__memo` property.
 */
export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T {
    // Use JSON.stringify on deps for a more robust comparison of object/array dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const memoizedValue = useMemo(factory, deps);

    // Attach a non-enumerable property to mark this object as memoized for our hooks.
    if (memoizedValue && typeof memoizedValue === 'object') {
        Object.defineProperty(memoizedValue, '__memo', {
            value: true,
            writable: false,
            enumerable: false,
            configurable: false,
        });
    }

    return memoizedValue;
}


/**
 * Build a Firestore ref/query once the lazily-loaded SDK is ready.
 * Returns null until then (useDoc/useCollection treat null as "waiting").
 * Use this instead of importing from 'firebase/firestore' on public pages.
 */
export function useFirebaseRef<T>(
  build: (f: LoadedFirebase) => T | null | undefined,
  deps: DependencyList
): T | null {
  const ctx = useContext(FirebaseContext);
  const services = ctx?.services ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(() => (services ? build(services) ?? null : null), [services, ...deps]);
  if (value && typeof value === 'object' && !(value as any).__memo) {
    Object.defineProperty(value, '__memo', { value: true, writable: false, enumerable: false, configurable: false });
  }
  return value;
}

export * from './provider';
// FirebaseClientProvider is removed, so we don't export it.
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './errors';
export * from './error-emitter';
