// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';

const get = vi.fn();
vi.mock('@/lib/firebase/admin', () => ({ firestoreDb: { collection: () => ({ doc: () => ({ get }) }) } }));
vi.mock('@/lib/security', () => ({ IS_PROD: true, IS_STRICT_PROD: true }));

import { GET } from '../route';

describe('/api/health', () => {
  it('liveness skips Firestore', async () => {
    get.mockClear();
    const res = await GET(new Request('http://x/api/health?probe=live'));
    expect(res.status).toBe(200);
    expect(get).not.toHaveBeenCalled();
    expect(res.headers.get('cache-control')).toContain('no-store');
  });
  it('readiness is healthy when Firestore answers', async () => {
    get.mockResolvedValueOnce({});
    const res = await GET(new Request('http://x/api/health'));
    expect(res.status).toBe(200);
    expect((await res.json()).services.firestore).toBe('operational');
  });
  it('503 without leaking the error', async () => {
    get.mockRejectedValueOnce(new Error('secret internal detail'));
    const res = await GET(new Request('http://x/api/health'));
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain('secret internal detail');
  });
});
