import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/constants', () => ({ SUPER_ADMIN_UIDS: [], SUPER_ADMIN_EMAILS: [] }));

import { middleware } from './middleware';

const req = (url: string, host?: string) => new NextRequest(url, { headers: host ? { host } : {} });

describe('middleware storefront routing', () => {
  it('rewrites coins.benched.au requests into /coins', async () => {
    const res = await middleware(req('https://coins.benched.au/browse?q=penny', 'coins.benched.au'));
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://coins.benched.au/coins/browse?q=penny');
  });
  it('rewrites the coins homepage', async () => {
    const res = await middleware(req('https://coins.benched.au/', 'coins.benched.au'));
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://coins.benched.au/coins');
  });
  it('redirects basketball listings on the coins host back to benched.au', async () => {
    const res = await middleware(req('https://coins.benched.au/cards/x/abc', 'coins.benched.au'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://benched.au/cards/x/abc');
  });
  it('serves the coins sitemap on the coins host', async () => {
    const res = await middleware(req('https://coins.benched.au/sitemap.xml', 'coins.benched.au'));
    expect(res.headers.get('x-middleware-rewrite')).toBe('https://coins.benched.au/coins/sitemap.xml');
  });
  it('no longer bounces /coins on benched.au to the homepage', async () => {
    const res = await middleware(req('https://benched.au/coins/2023-coin/jfg1MNbwSkdLTzGvFMMv', 'benched.au'));
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
  it('sends /browse?category=Coins on benched.au to the coins storefront', async () => {
    const res = await middleware(req('https://benched.au/browse?category=Coins&q=penny', 'benched.au'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://benched.au/coins/browse?q=penny');
  });
  it('requires sign-in for the coins sell form on either host', async () => {
    const a = await middleware(req('https://benched.au/coins/sell', 'benched.au'));
    expect(a.status).toBe(307);
    expect(a.headers.get('location')).toContain('/sign-in?redirect=%2Fcoins%2Fsell');
    const b = await middleware(req('https://coins.benched.au/sell', 'coins.benched.au'));
    expect(b.status).toBe(307);
    expect(b.headers.get('location')).toContain('/sign-in?redirect=%2Fsell');
  });
  it('leaves basketball pages alone', async () => {
    const res = await middleware(req('https://benched.au/cards', 'benched.au'));
    expect(res.status).toBe(200);
    expect(res.headers.get('x-middleware-rewrite')).toBeNull();
  });
});
