import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildPokemonQuery, looksLikePokemon, mapPokemonCards, pokemonTcgProvider } from './providers/pokemontcg';
import { mapEbayItems, ebayProvider } from './providers/ebay';
import { mapPriceCharting, priceChartingProvider } from './providers/pricecharting';
import { mapInternalSales } from './providers/internal';

const card = {
    name: 'Charizard', number: '4', set: { name: 'Base', series: 'Base', printedTotal: 102 },
    tcgplayer: { url: 'https://tcg/x', updatedAt: '2026/10/01', prices: { holofoil: { market: 300 } } },
    cardmarket: { url: 'https://cm/x', updatedAt: '2026/10/01', prices: { trendPrice: 200 } },
};

describe('pokemontcg provider', () => {
    it('detects + builds queries', () => {
        expect(looksLikePokemon({ query: 'Charizard 4/102 Base Set', category: 'Collector Cards' })).toBe(true);
        expect(looksLikePokemon({ query: 'Jordan 1 Chicago', category: 'Sneakers' })).toBe(false);
        expect(buildPokemonQuery('Charizard 4/102 Base Set Holo')).toBe('name:charizard* number:4');
    });
    it('maps USD/EUR prices to AUD market comps with links', () => {
        const comps = mapPokemonCards([card], 'Charizard 4/102 Base');
        expect(comps).toHaveLength(2);
        expect(comps[0]).toMatchObject({ source: 'pokemontcg', kind: 'market', originalCurrency: 'USD', url: 'https://tcg/x' });
        expect(comps[0].price).toBeCloseTo(456);
    });
    it('skips non-pokemon queries without a request', async () => {
        const f = vi.fn();
        const r = await pokemonTcgProvider({ query: 'Nike Dunk Panda', category: 'Sneakers' }, f as any);
        expect(f).not.toHaveBeenCalled();
        expect(r.comps).toEqual([]);
    });
    it('handles HTTP errors gracefully', async () => {
        const r = await pokemonTcgProvider({ query: 'Charizard 4/102' }, (async () => ({ ok: false, status: 429 })) as any);
        expect(r).toMatchObject({ ok: false, note: 'HTTP 429', comps: [] });
    });
});

describe('ebay provider', () => {
    afterEach(() => { delete process.env.EBAY_CLIENT_ID; delete process.env.EBAY_CLIENT_SECRET; });
    it('no keys = graceful note, no request', async () => {
        const f = vi.fn();
        const r = await ebayProvider({ query: 'Charizard' }, f as any);
        expect(f).not.toHaveBeenCalled();
        expect(r.ok).toBe(false);
        expect(r.note).toMatch(/EBAY_CLIENT_ID/);
    });
    it('maps active listings, filtering irrelevant titles', () => {
        const comps = mapEbayItems([
            { title: 'Charizard 4/102 Base Set Holo', price: { value: '500', currency: 'AUD' }, itemWebUrl: 'https://ebay/1' },
            { title: 'Random Pikachu', price: { value: '5', currency: 'AUD' } },
        ], 'Charizard Base 4/102', 'active');
        expect(comps).toHaveLength(1);
        expect(comps[0]).toMatchObject({ price: 500, kind: 'active', url: 'https://ebay/1' });
    });
    it('uses the token then searches EBAY_AU', async () => {
        process.env.EBAY_CLIENT_ID = 'id'; process.env.EBAY_CLIENT_SECRET = 'secret';
        const calls: string[] = [];
        const f = (async (url: string) => {
            calls.push(url);
            if (url.includes('oauth2/token')) return { ok: true, json: async () => ({ access_token: 'tok', expires_in: 7200 }) };
            return { ok: true, json: async () => ({ itemSummaries: [{ title: 'Charizard Base', price: { value: '100', currency: 'AUD' } }] }) };
        }) as any;
        const r = await ebayProvider({ query: 'Charizard Base' }, f);
        expect(r.ok).toBe(true);
        expect(r.comps[0].price).toBe(100);
        expect(calls.some(u => u.includes('item_summary/search'))).toBe(true);
    });
});

describe('pricecharting provider', () => {
    it('needs a token', async () => {
        const r = await priceChartingProvider({ query: 'x' }, vi.fn() as any);
        expect(r.note).toMatch(/PRICECHARTING_API_TOKEN/);
    });
    it('maps cents to AUD', () => {
        const comps = mapPriceCharting([{ id: 1, 'product-name': 'Charizard #4', 'console-name': 'Pokemon Base Set', 'loose-price': 10000 }], 'Charizard Base Set');
        expect(comps[0].price).toBeCloseTo(152);
    });
});

describe('internal sold prices', () => {
    it('uses paid orders only and excludes the listing itself', () => {
        const orders = [
            { status: 'completed', items: [{ id: 'a', title: 'Charizard Base Set 4/102', price: 400, discountedPrice: 380 }] },
            { status: 'awaiting_payment', items: [{ id: 'b', title: 'Charizard Base Set 4/102', price: 10 }] },
            { status: 'paid', items: [{ id: 'self', title: 'Charizard Base Set 4/102', price: 1 }] },
        ];
        const comps = mapInternalSales(orders, { query: 'Charizard Base Set 4/102', excludeProductId: 'self' });
        expect(comps.map(c => c.price)).toEqual([380]);
    });
});
