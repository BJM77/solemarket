import { describe, expect, it } from 'vitest';
import { coinInlineBrowseHref, coinInlineSorts, searchCoinIndex, toCoinSearchLite, coinIndexMetals } from './search-lite';

const base = { status: 'available', category: 'Coins', createdAt: { seconds: 1_700_000_000 } };
const rows = [
  toCoinSearchLite('g', { ...base, title: '2023 Kangaroo 1oz Gold', subCategory: 'Gold Bullion', metal: 'Gold', weight: '1 oz', purity: '99.99%', price: 4200, year: 2023 }),
  toCoinSearchLite('s', { ...base, title: '2024 Kookaburra 1oz Silver', subCategory: 'Silver Bullion', metal: 'Silver', weight: '1 oz', purity: '.999', price: 60, year: 2024 }),
  toCoinSearchLite('p', { ...base, title: '1930 Penny', subCategory: 'Australian Coins', condition: 'Fine', price: 25000 }),
].filter(Boolean) as NonNullable<ReturnType<typeof toCoinSearchLite>>[];

describe('coin inline search', () => {
  it('keeps only live, non-draft coin listings', () => {
    expect(toCoinSearchLite('x', { ...base, title: 'Jordan 1', category: 'Sneakers' })).toBeNull();
    expect(toCoinSearchLite('d', { ...base, title: '2023 Kangaroo', subCategory: 'Gold Bullion', isDraft: true })).toBeNull();
    expect(toCoinSearchLite('o', { ...base, status: 'sold', title: '2023 Kangaroo', subCategory: 'Gold Bullion' })).toBeNull();
    expect(rows).toHaveLength(3);
    expect(rows[0].url).toMatch(/^\/coins\//);
  });

  it('filters by type and metal and sorts by price', () => {
    expect(searchCoinIndex(rows, '', { type: 'bullion', sort: 'price-asc' }).rows.map((r) => r.id)).toEqual(['s', 'g']);
    expect(searchCoinIndex(rows, '', { type: 'all', metal: 'gold', sort: 'relevance' }).rows.map((r) => r.id)).toEqual(['g']);
    expect(searchCoinIndex(rows, 'penny', { type: 'coins', sort: 'relevance' }).rows.map((r) => r.id)).toEqual(['p']);
    expect(coinIndexMetals(rows)).toEqual(['gold', 'silver']);
  });

  it('only offers the premium sort when spot prices are available', () => {
    expect(coinInlineSorts({ spot: null, anyFineWeight: true }).map((s) => s.value)).not.toContain('premium-asc');
    expect(coinInlineSorts({ spot: { gold: 4000, silver: 50 }, anyFineWeight: true }).map((s) => s.value)).toContain('premium-asc');
  });

  it('links "see all" to /coins/browse with the same filters', () => {
    expect(coinInlineBrowseHref('kangaroo', { type: 'bullion', metal: 'gold', sort: 'price-asc' })).toBe('/coins/browse?q=kangaroo&coinType=bullion&metal=gold&sort=price-asc');
  });
});
