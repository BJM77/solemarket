
'use client';

import { useEffect, useRef } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * A client-side component that listens for Firestore permission errors
 * and logs them in development (never throws).
 * This is essential for debugging Security Rules during development.
 * 
 * Errors during the first 3 seconds after mount are suppressed — they 
 * are almost always benign race conditions where a listener fires before 
 * Firebase Auth has finished initializing.
 */
export function FirebaseErrorListener() {
  const mountTime = useRef(Date.now());

  useEffect(() => {
    const handleError = (error: FirestorePermissionError) => {
      // Suppress errors that fire during the auth-initialization window.
      // These are always transient races (auth=null) and not real rule violations.
      const elapsed = Date.now() - mountTime.current;
      if (elapsed < 3000) return;

      // Never throw: an uncaught throw from an event handler surfaces as an
      // "Uncaught FirebaseError" in visitors' consoles. Log in development only.
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Firestore permission denied]', error.message);
      }
    };

    // Subscribe to the custom 'permission-error' event
    errorEmitter.on('permission-error', handleError);

    // Clean up the subscription when the component unmounts
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, []); // Run this effect only once when the component mounts

  // This component does not render anything to the DOM.
  return null;
}
