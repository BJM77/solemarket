import { describe, it, expect } from 'vitest';
import {
  toSearchLite, searchIndex, scoreRow, tokenize, buildBrowseHref, cacheKey, sizeOptions, LruCache,
  rowDetail, formatAud, pushRecent, DEFAULT_FILTERS, type SearchLite,
} from './inline';

const live = { status: 'available', isDraft: false };
const rows: SearchLite[] = [
  toSearchLite('s1', { ...live, title: 'Nike LeBron 22 Lakers', price: 260, category: 'Sneakers', size: 'US 10', brand: 'Nike', createdAt: { seconds: 300 } })!,
  toSearchLite('s2', { ...live, title: 'Nike Kyrie 7', price: 120, category: 'Sneakers', size: '10.5', createdAt: { seconds: 200 } })!,
  toSearchLite('s3', { ...live, title: 'Adidas Harden Vol 8', price: '$90', category: 'Sneakers', size: 'US 9', createdAt: { seconds: 100 } })!,
  toSearchLite('c1', { ...live, title: '2023 Prizm LeBron James', price: 45, category: 'Collector Cards', year: 2023, gradingCompany: 'PSA', grade: '10', createdAt: { seconds: 400 } })!,
  toSearchLite('c2', { ...live, title: 'OG Anunoby Rookie', price: 600, category: 'Collector Cards', year: 2018, createdAt: { seconds: 50 } })!,
];

describe('toSearchLite', () => {
  it('maps a live listing to a lite row', () => {
    expect(rows[0]).toMatchObject({ id: 's1', kind: 'shoes', price: 260, size: '10', created: 300 });
    expect(rows[2].price).toBe(90);
    expect(rows[3]).toMatchObject({ kind: 'cards', year: 2023 });
    expect(rows[3].extra).toContain('PSA');
  });
  it('drops non-live, $0, Pokémon and coin listings', () => {
    expect(toSearchLite('x', { title: 'A', price: 5, status: 'sold' })).toBeNull();
    expect(toSearchLite('x', { title: 'A', price: 5, status: 'available', isDraft: true })).toBeNull();
    expect(toSearchLite('x', { ...live, title: 'A', price: 0 })).toBeNull();
    expect(toSearchLite('x', { ...live, title: 'Charizard', price: 5, subCategory: 'Pokémon' })).toBeNull();
    expect(toSearchLite('x', { ...live, title: 'Antique Sail Fossil', price: 5, category: 'Collector Cards', subCategory: 'Sports Cards', brand: 'Panini', specs: { setName: 'Pokemon', pokemonCode: 'POR' } })).toBeNull();
    expect(toSearchLite('x', { ...live, title: 'Blue-Eyes White Dragon', price: 5, subCategory: 'Yu-Gi-Oh!' })).toBeNull();
    expect(toSearchLite('x', { ...live, title: '2024 Topps Chrome Shota Imanaga', price: 5, category: 'Collector Cards', brand: 'Topps' })).not.toBeNull();
    expect(toSearchLite('x', { ...live, title: '1oz Silver', price: 5, category: 'Coins' })).toBeNull();
    expect(toSearchLite('x', { ...live, title: 'Penny', price: 5, storefrontId: 'coins' })).toBeNull();
    expect(toSearchLite('x', { ...live, title: '', price: 5 })).toBeNull();
  });
});

describe('scoring', () => {
  it('requires every token to prefix-match', () => {
    expect(scoreRow(rows[0], tokenize('lebron 22'))).toBeGreaterThan(0);
    expect(scoreRow(rows[0], tokenize('leb'))).toBeGreaterThan(0);
    expect(scoreRow(rows[0], tokenize('lebron kyrie'))).toBe(0);
    expect(scoreRow(rows[3], tokenize('psa'))).toBeGreaterThan(0);
  });
  it('ignores case and punctuation', () => {
    expect(tokenize("  LeBron's  22! ")).toEqual(['lebron', 's', '22']);
  });
});

describe('searchIndex', () => {
  it('returns matches with a total', () => {
    const r = searchIndex(rows, 'lebron', DEFAULT_FILTERS);
    expect(r.total).toBe(2);
    expect(r.rows.map((x) => x.id).sort()).toEqual(['c1', 's1']);
  });
  it('filters by category, size and price', () => {
    expect(searchIndex(rows, 'lebron', { ...DEFAULT_FILTERS, category: 'cards' }).rows.map((x) => x.id)).toEqual(['c1']);
    expect(searchIndex(rows, 'nike', { ...DEFAULT_FILTERS, category: 'shoes', size: 'US 10.5' }).rows.map((x) => x.id)).toEqual(['s2']);
    expect(searchIndex(rows, 'nike', { ...DEFAULT_FILTERS, price: '100-250' }).rows.map((x) => x.id)).toEqual(['s2']);
    expect(searchIndex(rows, 'og', { ...DEFAULT_FILTERS, price: '500+' }).rows.map((x) => x.id)).toEqual(['c2']);
  });
  it('ignores the size filter outside shoes', () => {
    expect(searchIndex(rows, 'lebron', { ...DEFAULT_FILTERS, size: '10' }).total).toBe(2);
  });
  it('sorts', () => {
    const ids = (sort: any) => searchIndex(rows, 'nike', { ...DEFAULT_FILTERS, sort }).rows.map((x) => x.id);
    expect(ids('price-asc')).toEqual(['s2', 's1']);
    expect(ids('price-desc')).toEqual(['s1', 's2']);
    expect(ids('newest')).toEqual(['s1', 's2']);
  });
  it('caps rows but counts everything', () => {
    const r = searchIndex(rows, '', DEFAULT_FILTERS, 2);
    expect(r.rows).toHaveLength(2);
    expect(r.total).toBe(5);
  });
  it('lists sizes among shoe matches', () => {
    expect(sizeOptions(rows, 'nike', { ...DEFAULT_FILTERS, category: 'shoes' })).toEqual(['10', '10.5']);
  });
});

describe('buildBrowseHref', () => {
  it('carries query and filters', () => {
    expect(buildBrowseHref(' kyrie ', DEFAULT_FILTERS)).toBe('/browse?q=kyrie');
    expect(buildBrowseHref('kyrie', { category: 'shoes', size: 'US 10', price: '100-250', sort: 'price-asc' }))
      .toBe('/browse?q=kyrie&category=Sneakers&sizes=10&priceRange=100%2C250&sort=price-asc');
    expect(buildBrowseHref('', { category: 'cards', price: '500+', sort: 'newest', size: '10' }))
      .toBe('/browse?category=Collector+Cards&priceRange=500%2C100000&sort=createdAt-desc');
  });
});

describe('cache helpers', () => {
  it('builds stable keys', () => {
    expect(cacheKey('LeBron  22', DEFAULT_FILTERS)).toBe(cacheKey('lebron 22', DEFAULT_FILTERS));
    expect(cacheKey('a', DEFAULT_FILTERS)).not.toBe(cacheKey('a', { ...DEFAULT_FILTERS, sort: 'newest' }));
  });
  it('evicts least recently used', () => {
    const c = new LruCache<number>(2);
    c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3);
    expect(c.get('b')).toBeUndefined();
    expect(c.get('a')).toBe(1);
    expect(c.size).toBe(2);
  });
});

describe('display helpers', () => {
  it('formats rows and prices', () => {
    expect(rowDetail(rows[0])).toBe('US 10 · Shoes');
    expect(rowDetail(rows[3])).toBe('2023 · Cards');
    expect(formatAud(1200)).toBe('$1,200');
    expect(formatAud(9.5)).toBe('$9.50');
  });
  it('keeps recent searches unique and capped', () => {
    expect(pushRecent(['kyrie', 'lebron'], 'LeBron')).toEqual(['LeBron', 'kyrie']);
    expect(pushRecent(['a', 'b', 'c', 'd', 'e'], 'f')).toEqual(['f', 'a', 'b', 'c', 'd']);
    expect(pushRecent(['a'], '  ')).toEqual(['a']);
  });
});
