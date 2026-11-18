
'use client';
    
import { useState, useEffect } from 'react';
import type {
  DocumentReference,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useFirebase } from '../provider';

/** Utility type to add an 'id' field to a given type T. */
type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

interface UseDocOptions<T> {
  initialData?: T;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemoFirebase to memoize it.
 *
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} memoizedDocRef -
 * The Firestore DocumentReference, wrapped in useMemoFirebase. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData>  & {__memo?: boolean}) | null | undefined,
  options: UseDocOptions<WithId<T>> = {}
): UseDocResult<T> {
  const { isUserLoading } = useFirebase();
  const [data, setData] = useState<WithId<T> | null>(options.initialData || null);
  const [isLoading, setIsLoading] = useState<boolean>(!options.initialData);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  useEffect(() => {
    // Keep server-provided initialData on screen while Auth/the SDK start:
    // clearing it here unmounted the listing photo and made first-time visits
    // look like the image appeared, vanished, then reloaded. Without
    // initialData, report loading as before.
    if (isUserLoading) {
        if (!options.initialData) setIsLoading(true);
        return;
    }

    // No ref (signed out, or the SDK is not ready yet): fall back to the
    // server-provided data if any, otherwise nothing, and stop loading so
    // consumers never wait forever (e.g. a stale favourite after sign-out).
    if (!memoizedDocRef) {
      setData(options.initialData || null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!options.initialData) {
        setIsLoading(true);
    } else {
        setIsLoading(false);
    }
    setError(null);

    // The ref exists, so the SDK is already loaded; this import resolves from cache.
    let unsubscribe: () => void = () => {};
    let cancelled = false;
    import('firebase/firestore').then(({ onSnapshot }) => {
    if (cancelled) return;
    unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else if (!options.initialData || !snapshot.metadata.fromCache) {
          // With initialData, only an empty cache read is ignored; once the
          // server confirms the document is gone (deleted), clear it.
          setData(null);
        }
        setError(null); // Clear any previous error on successful snapshot (even if doc doesn't exist)
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                operation: 'get',
                path: memoizedDocRef.path,
            });
            setError(contextualError);
            errorEmitter.emit('permission-error', contextualError);
        } else {
             console.error("Firestore Error:", error);
             setError(error);
        }
        // A permission error or other failure must not leave stale data looking live.
        setData(null);
        setIsLoading(false);
      }
    );
    });

    return () => { cancelled = true; unsubscribe(); };
  }, [memoizedDocRef, options.initialData, isUserLoading]);
  
  if(memoizedDocRef && !(memoizedDocRef as any).__memo) {
    if (process.env.NODE_ENV === 'development') {
      const errorMsg = 'A query passed to useDoc was not properly memoized using useMemoFirebase. This will cause infinite render loops.';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  return { data, isLoading, error };
}
