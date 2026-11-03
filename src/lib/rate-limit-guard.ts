import 'server-only';
import { headers } from 'next/headers';

/**
 * Two-tier rate limiting for server actions and route handlers.
 *
 * Limits are enforced globally (shared across all server instances) with the
 * Firestore fixed-window limiter in ./rate-limiter. The in-memory limiter is
 * only a fallback used when Firestore is unreachable, so the site keeps
 * working (per-instance limits) instead of failing every request.
 */

type Bucket = number[];
const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export function memoryRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (now - lastSweep > 60_000) {
    for (const [k, ts] of buckets) {
      if (!ts.length || ts[ts.length - 1] < now - 3_600_000) buckets.delete(k);
    }
    lastSweep = now;
  }
  const ts = (buckets.get(key) || []).filter((t) => t > now - windowMs);
  if (ts.length >= limit) {
    buckets.set(key, ts);
    return false;
  }
  ts.push(now);
  buckets.set(key, ts);
  return true;
}

/** Best-effort client IP from proxy headers (App Hosting / Cloud Run sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    return (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'unknown').trim();
  } catch {
    return 'unknown';
  }
}

export class RateLimitError extends Error {
  constructor(public action: string) {
    super('Too many requests. Please wait a moment and try again.');
    this.name = 'RateLimitError';
  }
}

export interface RateLimitOptions {
  limit: number;
  windowSeconds: number;
  /** Identify by this (e.g. uid) instead of IP. */
  identifier?: string;
  /** @deprecated All limits are now Firestore-backed; kept for compatibility. */
  persistent?: boolean;
}

/** Returns true if allowed. Shared across instances via Firestore. */
export async function checkRateLimit(action: string, opts: RateLimitOptions): Promise<boolean> {
  const id = opts.identifier || (await clientIp());
  const { tryRateLimit } = await import('./rate-limiter');
  const r = await tryRateLimit(id, action, opts.limit, opts.windowSeconds);
  if (r) return r.success;
  // Firestore unavailable: degrade to the per-instance limiter.
  return memoryRateLimit(`${action}:${id}`, opts.limit, opts.windowSeconds * 1000);
}

/** Throws RateLimitError when the caller is over the limit. */
export async function assertRateLimit(action: string, opts: RateLimitOptions): Promise<void> {
  if (!(await checkRateLimit(action, opts))) throw new RateLimitError(action);
}
