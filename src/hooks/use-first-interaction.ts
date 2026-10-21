'use client';
import { useEffect, useState } from 'react';

const EVENTS = ['pointerdown', 'touchstart', 'scroll', 'keydown', 'mousemove'] as const;

/**
 * Becomes true on the visitor's first tap, scroll, key or mouse move, or after
 * `timeoutMs` as a fallback. Used to keep third-party tags (GA, Facebook pixel)
 * off the main thread while the page is first loading on phones.
 */
export function useFirstInteraction(timeoutMs = 10000): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready) return;
    const fire = () => setReady(true);
    const opts: AddEventListenerOptions = { once: true, passive: true };
    EVENTS.forEach((e) => window.addEventListener(e, fire, opts));
    const t = window.setTimeout(fire, timeoutMs);
    return () => {
      EVENTS.forEach((e) => window.removeEventListener(e, fire));
      window.clearTimeout(t);
    };
  }, [ready, timeoutMs]);
  return ready;
}
