import { describe, it, expect } from 'vitest';
import { storefrontRootRewrite, resolveStorefrontId, normaliseHost, getStorefrontConfig, STOREFRONTS, determineProductStorefrontId } from './storefronts';

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

describe('storefront folders', () => {
  it('has a base path per storefront', () => {
    expect(STOREFRONTS.coins.basePath).toBe('/coins');
    expect(STOREFRONTS.pokemon.basePath).toBe('/pokemon');
    expect(STOREFRONTS.seller.basePath).toBe('/sellers');
    expect(STOREFRONTS.basketball.basePath).toBe('/');
  });
  it('maps a subdomain homepage to its folder, and nothing else', () => {
    expect(storefrontRootRewrite('coins.benched.au', '/')).toBe('/coins');
    expect(storefrontRootRewrite('pokemon.benched.au', '/')).toBe('/pokemon');
    expect(storefrontRootRewrite('seller.benched.au', '/')).toBe('/sellers');
    expect(storefrontRootRewrite('coins.benched.au', '/p/abc')).toBeNull();
    expect(storefrontRootRewrite('benched.au', '/')).toBeNull();
    expect(storefrontRootRewrite('localhost:3000', '/')).toBeNull();
  });
});

describe('determineProductStorefrontId', () => {
  it('routes TCG listings to pokemon, including mis-filed Pokémon', () => {
    expect(determineProductStorefrontId({ subCategory: 'Pokémon' })).toBe('pokemon');
    expect(determineProductStorefrontId({ subCategory: 'Yu-Gi-Oh!' })).toBe('pokemon');
    expect(determineProductStorefrontId({ title: 'Magic: The Gathering Bloomburrow' })).toBe('pokemon');
    expect(determineProductStorefrontId({
      title: 'Antique Sail Fossil',
      category: 'Collector Cards',
      subCategory: 'Sports Cards',
      brand: 'Panini',
      specs: { setName: 'Pokemon', pokemonCode: 'POR' },
    })).toBe('pokemon');
  });
  it('keeps sports cards on basketball and coins on coins', () => {
    expect(determineProductStorefrontId({ title: '2024 Topps Chrome Shota Imanaga', brand: 'Topps' })).toBe('basketball');
    expect(determineProductStorefrontId({ title: '2023 Panini Prizm Magic Johnson', brand: 'Panini' })).toBe('basketball');
    expect(determineProductStorefrontId({ title: 'Orlando Magic jersey card', category: 'Collector Cards' })).toBe('basketball');
    expect(determineProductStorefrontId({ category: 'Coins', title: '1930 Penny' })).toBe('coins');
    expect(determineProductStorefrontId({ storefrontId: 'basketball', subCategory: 'Pokémon' })).toBe('basketball');
  });
});
