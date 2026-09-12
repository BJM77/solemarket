
'use client';

import { useEffect } from 'react';

const useBeforeUnload = (when: boolean, message: string = 'Changes you made may not be saved.') => {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (when) {
        event.preventDefault();
        // Modern browsers show a generic message, but this is required for older ones.
        event.returnValue = message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, message]);
};

export const BeforeUnload = ({ when }: { when: boolean }) => {
  useBeforeUnload(when);
  return null;
};
