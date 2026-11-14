import { describe, it, expect } from 'vitest';
import { matchLandingListings, matchBrandListings, latestListingDate } from './landing-listings';

const live = (id: string, extra: Record<string, unknown>) => ({
  id, status: 'available', isDraft: false, price: 50, createdAt: { seconds: Number(id.replace(/\D/g, '')) || 1, nanoseconds: 0 }, ...extra,
}) as any;

const products = [
  live('c1', { title: '2023 Panini Phoenix Paragon Victor Wembanyama #13', category: 'Collector Cards', subCategory: 'Basketball Cards' }),
  live('c2', { title: '2024 Panini Revolution Victor Wembanyama #79', category: 'Collector Cards', subCategory: 'Basketball Cards' }),
  live('c3', { title: '2024 Panini Prizm Deep Space LeBron James #5', category: 'Collector Cards', brand: 'Panini Prizm Deep Space' }),
  live('s1', { title: 'Air Jordan 1 Retro High OG Varsity Red', category: 'Sneakers', brand: 'Jordan' }),
  live('s2', { title: 'Air Jordan 11 Retro Cool Grey', category: 'Sneakers', brand: 'Jordan' }),
  live('p1', { title: '2023 Pokémon Obsidian Flames Absol ex #214', category: 'Collector Cards', subCategory: 'Pokémon' }),
  live('d1', { title: 'Draft Wembanyama', category: 'Collector Cards', isDraft: true }),
  live('x1', { title: 'Sold Wembanyama', category: 'Collector Cards', status: 'sold' }),
];

describe('matchLandingListings', () => {
  it('matches every query word against the title and skips drafts and sold items', () => {
    const ids = matchLandingListings(products, { query: 'Wembanyama', kind: 'cards' }).map((p) => p.id);
    expect(ids.sort()).toEqual(['c1', 'c2']);
  });

  it('matches structured fields such as brand', () => {
    expect(matchLandingListings(products, { query: 'Panini Prizm', kind: 'cards' }).map((p) => p.id)).toContain('c3');
  });

  it('requires model numbers to match exactly', () => {
    expect(matchLandingListings(products, { query: 'Jordan 1', kind: 'shoes' }).map((p) => p.id)).toEqual(['s1']);
  });

  it('keeps Pokémon / TCG listings off main-site landing pages and respects kind', () => {
    expect(matchLandingListings(products, { query: 'Absol' })).toEqual([]);
    expect(matchLandingListings(products, { query: 'Jordan', kind: 'cards' })).toEqual([]);
  });

  it('returns nothing for an empty query and honours the limit', () => {
    expect(matchLandingListings(products, { query: '  ' })).toEqual([]);
    expect(matchLandingListings(products, { query: 'Panini', limit: 1 })).toHaveLength(1);
  });
});

describe('latestListingDate', () => {
  it('returns the newest updatedAt/createdAt', () => {
    const d = latestListingDate([
      { id: 'a', createdAt: { seconds: 100 } } as any,
      { id: 'b', createdAt: { seconds: 50 }, updatedAt: { seconds: 300 } } as any,
    ]);
    expect(d?.getTime()).toBe(300_000);
    expect(latestListingDate([])).toBeUndefined();
  });
});

describe('matchBrandListings', () => {
  const items = [
    live('a1', { title: 'Air Jordan 1 Retro High OG', category: 'Sneakers' }),
    live('a2', { title: '1997 Fleer Michael Jordan #23', category: 'Collector Cards', brand: 'Fleer' }),
    live('a3', { title: 'Nike Lebron 22 Monopoly', category: 'Sneakers', brand: 'Nike' }),
    live('a4', { title: '2024 Panini Prizm Deep Space LeBron James #5', category: 'Collector Cards', brand: 'Panini Prizm Deep Space' }),
    live('a5', { title: '2019 Panini Mosaic Zion', category: 'Collector Cards' }),
  ];
  it('matches brand fields or a leading brand in the title, not player names', () => {
    expect(matchBrandListings(items, 'Jordan').map((p) => p.id)).toEqual(['a1']);
    expect(matchBrandListings(items, 'Nike').map((p) => p.id)).toEqual(['a3']);
    expect(matchBrandListings(items, 'Panini').map((p) => p.id).sort()).toEqual(['a4', 'a5']);
  });
});
