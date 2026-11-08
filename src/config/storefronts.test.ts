import { describe, it, expect } from 'vitest';
import { resolveStorefrontId, normaliseHost, getStorefrontConfig, STOREFRONTS } from './storefronts';

describe('storefront host resolution', () => {
  it('maps known hosts', () => {
    expect(resolveStorefrontId('benched.au')).toBe('basketball');
    expect(resolveStorefrontId('www.benched.au')).toBe('basketball');
    expect(resolveStorefrontId('coins.benched.au')).toBe('coins');
    expect(resolveStorefrontId('POKEMON.benched.au:443')).toBe('pokemon');
    expect(resolveStorefrontId('seller.benched.au.')).toBe('seller');
  });
  it('falls back to the default storefront for unknown hosts', () => {
    expect(resolveStorefrontId('localhost:3000')).toBe('basketball');
    expect(resolveStorefrontId('studio-123.web.app')).toBe('basketball');
    expect(resolveStorefrontId(undefined)).toBe('basketball');
    expect(resolveStorefrontId('evil.com')).toBe('basketball');
  });
  it('normalises hosts', () => {
    expect(normaliseHost(' Benched.AU:8080 ')).toBe('benched.au');
  });
  it('returns default config for unknown ids', () => {
    expect(getStorefrontConfig('nope').id).toBe('basketball');
    expect(getStorefrontConfig('coins').id).toBe('coins');
  });
  it('has unique hosts across storefronts', () => {
    const all = Object.values(STOREFRONTS).flatMap((s) => s.hosts);
    expect(new Set(all).size).toBe(all.length);
  });
});
