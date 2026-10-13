import 'server-only';
import { headers } from 'next/headers';

/**
 * Two-tier rate limiting for server actions and route handlers.
 *
 * Tier 1 (always): in-memory sliding window per server instance - free and fast,
 *   stops bursts/scripted abuse. With maxInstances>1 the effective limit is
 *   limit x instances, which is acceptable for burst protection.
 * Tier 2 (opt-in, `persistent: true`): Firestore-backed global limiter from
 *   ./rate-limiter for expensive or abuse-prone actions (AI calls, listing creation).
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
  /** Also enforce globally via Firestore (costs one transaction per call). */
  persistent?: boolean;
}

/** Returns true if allowed. */
export async function checkRateLimit(action: string, opts: RateLimitOptions): Promise<boolean> {
  const id = opts.identifier || (await clientIp());
  if (!memoryRateLimit(`${action}:${id}`, opts.limit, opts.windowSeconds * 1000)) return false;
  if (opts.persistent) {
    const { rateLimit } = await import('./rate-limiter');
    const r = await rateLimit(id.replace(/[^a-zA-Z0-9_.:-]/g, '_'), action, opts.limit, opts.windowSeconds);
    return r.success;
  }
  return true;
}

/** Throws RateLimitError when the caller is over the limit. */
export async function assertRateLimit(action: string, opts: RateLimitOptions): Promise<void> {
  if (!(await checkRateLimit(action, opts))) throw new RateLimitError(action);
}
