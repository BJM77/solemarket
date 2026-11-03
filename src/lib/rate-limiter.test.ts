// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('./firebase/admin', () => ({ firestoreDb: {} }));
import { firestoreRateLimit, windowFor, rateLimitDocId } from './rate-limiter';

function fakeDb() {
    const store = new Map<string, any>();
    const db: any = {
        store,
        collection: (c: string) => ({ doc: (id: string) => ({ path: `${c}/${id}` }) }),
        runTransaction: async (fn: any) => fn({
            get: async (ref: any) => ({ exists: store.has(ref.path), data: () => store.get(ref.path) }),
            set: (ref: any, v: any) => store.set(ref.path, v),
        }),
    };
    return db;
}

describe('firestoreRateLimit', () => {
    it('allows up to the limit then blocks, shared across callers', async () => {
        const db = fakeDb();
        const t = 1_000_000_000;
        expect((await firestoreRateLimit(db, 'u1', 'price-check', 2, 600, t)).success).toBe(true);
        expect((await firestoreRateLimit(db, 'u1', 'price-check', 2, 600, t + 1)).success).toBe(true);
        const r = await firestoreRateLimit(db, 'u1', 'price-check', 2, 600, t + 2);
        expect(r.success).toBe(false);
        expect(r.reset).toBe(windowFor(t, 600).reset);
    });
    it('resets in the next window and isolates identifiers/actions', async () => {
        const db = fakeDb();
        const t = 1_000_000_000;
        await firestoreRateLimit(db, 'u1', 'a', 1, 60, t);
        expect((await firestoreRateLimit(db, 'u1', 'a', 1, 60, t)).success).toBe(false);
        expect((await firestoreRateLimit(db, 'u2', 'a', 1, 60, t)).success).toBe(true);
        expect((await firestoreRateLimit(db, 'u1', 'b', 1, 60, t)).success).toBe(true);
        expect((await firestoreRateLimit(db, 'u1', 'a', 1, 60, t + 60_000)).success).toBe(true);
    });
    it('writes a TTL expireAt after the window end', async () => {
        const db = fakeDb();
        await firestoreRateLimit(db, '1.2.3.4', 'search', 5, 60, 120_000);
        const doc = [...db.store.values()][0];
        expect(doc.count).toBe(1);
        expect(doc.expireAt.toMillis()).toBeGreaterThan(180_000);
    });
    it('sanitises doc ids', () => {
        expect(rateLimitDocId('a/b c', 'x', 0)).not.toContain('/');
    });
});
