'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Likely next taps from each section, Marketplace-style. */
const NEXT_ROUTES: Record<string, string[]> = {
  '/': ['/cards', '/browse', '/shoes', '/coins'],
  '/cards': ['/browse', '/multibuy'],
  '/shoes': ['/browse'],
  '/coins': ['/browse', '/multibuy'],
  '/browse': ['/cards', '/shoes'],
};

/**
 * Warms likely next pages after the browser is idle, so it never competes
 * with LCP. Skips slow/data-saver connections.
 */
export function PrefetchLikelyRoutes() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const routes = NEXT_ROUTES[pathname ?? ''];
    if (!routes) return;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? '')) return;

    const run = () => routes.forEach((r) => { try { router.prefetch(r); } catch { /* ignore */ } });
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    // Wait for load + a beat so first paint and the hero image win.
    const timer = window.setTimeout(() => {
      if (w.requestIdleCallback) w.requestIdleCallback(run, { timeout: 4000 });
      else run();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  return null;
}
