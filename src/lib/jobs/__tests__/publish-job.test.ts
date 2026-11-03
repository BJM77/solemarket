// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/listings/publish-core', () => ({ publishListingAs: vi.fn() }));

const store: Record<string, any> = {};
function applyUpdate(doc: any, u: Record<string, any>) {
  for (const [k, v] of Object.entries(u)) {
    if (v && v.__union) { doc[k] = [...new Set([...(doc[k] || []), ...v.__union])]; continue; }
    if (k.startsWith('errors.')) { doc.errors = { ...(doc.errors || {}), [k.slice(7)]: v }; continue; }
    doc[k] = v;
  }
}
vi.mock('@/lib/firebase/admin', () => {
  const ref = (id: string) => ({
    id,
    get: async () => ({ exists: !!store[id], data: () => store[id] }),
    set: async (d: any) => { store[id] = { ...d }; },
    update: async (u: any) => applyUpdate(store[id], u),
  });
  let n = 0;
  return {
    firestoreDb: {
      collection: () => ({ doc: (id?: string) => ref(id ?? `job${++n}`) }),
      runTransaction: async (fn: any) => fn({ get: (r: any) => r.get(), update: (r: any, u: any) => r.update(u) }),
    },
  };
});
vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'ts', arrayUnion: (...a: any[]) => ({ __union: a }) },
  Timestamp: { fromMillis: (m: number) => m },
}));

import { createPublishJob, runPublishSlice, toView } from '../publish-job';

describe('publish job', () => {
  beforeEach(() => { for (const k of Object.keys(store)) delete store[k]; });

  it('processes drafts, records errors, finishes', async () => {
    const { jobId, runToken } = await createPublishJob('u1', ['a', 'b', 'a', 'c']);
    const publish = vi.fn(async (id: string) => { if (id === 'b') throw new Error('Price must be > 0'); });
    const more = await runPublishSlice(jobId, runToken, publish);
    expect(more).toBe(false);
    expect(publish).toHaveBeenCalledTimes(3);
    expect(publish).toHaveBeenCalledWith('a', 'u1');
    const v = toView(jobId, store[jobId]);
    expect(v).toMatchObject({ status: 'done', total: 3, processed: 3, published: ['a', 'c'], errors: { b: 'Price must be > 0' } });
  });

  it('rejects a wrong run token', async () => {
    const { jobId } = await createPublishJob('u1', ['a']);
    const publish = vi.fn();
    expect(await runPublishSlice(jobId, 'nope', publish)).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });

  it('stops at the time budget and resumes from the cursor', async () => {
    const { jobId, runToken } = await createPublishJob('u1', ['a', 'b', 'c']);
    const publish = vi.fn(async () => { await new Promise((r) => setTimeout(r, 15)); });
    expect(await runPublishSlice(jobId, runToken, publish, 10)).toBe(true);
    expect(store[jobId].cursor).toBe(1);
    expect(store[jobId].status).toBe('queued');
    while (await runPublishSlice(jobId, runToken, publish, 10)) { /* continue */ }
    expect(store[jobId].published).toEqual(['a', 'b', 'c']);
    expect(store[jobId].status).toBe('done');
  });

  it('does not run while another worker holds the lease', async () => {
    const { jobId, runToken } = await createPublishJob('u1', ['a']);
    store[jobId].leaseUntil = Date.now() + 60_000;
    const publish = vi.fn();
    expect(await runPublishSlice(jobId, runToken, publish)).toBe(false);
    expect(publish).not.toHaveBeenCalled();
  });
});
