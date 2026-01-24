
'use client';
    
import { useState, useEffect } from 'react';
import {
  DocumentReference,
  onSnapshot,
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
    if (isUserLoading) {
        setTimeout(() => {
            setIsLoading(true);
        }, 0);
        return;
    }

    if (!memoizedDocRef) {
      setTimeout(() => {
        setData(null);
        setIsLoading(false);
        setError(null);
      }, 0);
      return;
    }
    
    if (options.initialData) {
        setTimeout(() => {
            setIsLoading(false);
        }, 0);
    } else {
        setTimeout(() => {
            setIsLoading(true);
        }, 0);
    }
    
    setTimeout(() => {
        setError(null);
    }, 0);

    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          // Document does not exist
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
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [memoizedDocRef, options.initialData, isUserLoading]);
  
  if(memoizedDocRef && !(memoizedDocRef as any).__memo) {
    throw new Error('A query passed to useDoc was not properly memoized using useMemoFirebase. This will cause infinite render loops.');
  }

  return { data, isLoading, error };
}
