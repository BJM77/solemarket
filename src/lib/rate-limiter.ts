import { firestoreDb } from './firebase/admin';
import * as admin from 'firebase-admin';

/**
 * Shared (cross-instance) rate limiter backed by Firestore.
 *
 * Fixed-window counters: one doc per (identifier, action, window) in
 * `rate_limits`, incremented inside a transaction. Each doc carries an
 * `expireAt` Timestamp so a Firestore TTL policy on rate_limits.expireAt can
 * delete old windows automatically (free).
 */

export interface RateLimitResult { success: boolean; remaining: number; reset: number }

export function windowFor(now: number, windowSeconds: number) {
    const windowMs = windowSeconds * 1000;
    const start = Math.floor(now / windowMs) * windowMs;
    return { start, reset: start + windowMs };
}

export function rateLimitDocId(identifier: string, action: string, windowStart: number) {
    const safe = (s: string) => s.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 300);
    return `${safe(action)}__${safe(identifier)}__${windowStart}`;
}

/** Thrown-error-free core so it can be unit tested with a fake db. */
export async function firestoreRateLimit(
    db: Pick<admin.firestore.Firestore, 'collection' | 'runTransaction'>,
    identifier: string,
    action: string,
    limit: number,
    windowSeconds: number,
    now = Date.now(),
): Promise<RateLimitResult> {
    const { start, reset } = windowFor(now, windowSeconds);
    const ref = db.collection('rate_limits').doc(rateLimitDocId(identifier, action, start));
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const count = snap.exists ? Number(snap.data()?.count || 0) : 0;
        if (count >= limit) return { success: false, remaining: 0, reset };
        tx.set(ref, {
            count: count + 1,
            action,
            identifier,
            windowStart: start,
            // TTL field: keep a little past the window end
            expireAt: admin.firestore.Timestamp.fromMillis(reset + 60_000),
        });
        return { success: true, remaining: limit - count - 1, reset };
    });
}

/**
 * Persistent rate limit. On Firestore errors it returns `null` from
 * tryRateLimit so callers can fall back; `rateLimit` keeps the old
 * fail-closed behaviour for callers that rely on it.
 */
export async function tryRateLimit(identifier: string, action: string, limit: number, windowSeconds: number): Promise<RateLimitResult | null> {
    try {
        return await firestoreRateLimit(firestoreDb, identifier, action, limit, windowSeconds);
    } catch (error: any) {
        console.error(`Rate limiter (Firestore) error for ${action}:`, error?.message || error);
        return null;
    }
}

export async function rateLimit(identifier: string, action: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const r = await tryRateLimit(identifier, action, limit, windowSeconds);
    return r ?? { success: false, remaining: 0, reset: Date.now() + 60_000 };
}
