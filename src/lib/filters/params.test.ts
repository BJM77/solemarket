import { describe, it, expect } from 'vitest';
import { parseRange, normalizeSize, sizeQueryVariants, sizeMatches, parseFilterSearchParams, activeFilterChips, clearFiltersHref, facetsFor, sortOptionsFor, applyClientSort, formatPriceRange } from './params';

describe('filter params', () => {
  it('parses price ranges in all URL spellings', () => {
    expect(parseRange('1,2')).toEqual([1, 2]);
    expect(parseRange('100-500')).toEqual([100, 500]);
    expect(parseRange('$100-$500')).toEqual([100, 500]);
    expect(parseRange('500,100')).toEqual([100, 500]);
    expect(parseRange('abc')).toBeUndefined();
  });
  it('formats price chips', () => {
    expect(formatPriceRange([1, 2])).toBe('$1–$2');
    expect(formatPriceRange([0, 200])).toBe('Under $200');
  });
  it('normalises sizes so chips match stored values', () => {
    expect(normalizeSize('US 10')).toBe('10');
    expect(normalizeSize('us10.5')).toBe('10.5');
    expect(normalizeSize('10.0')).toBe('10');
    expect(sizeQueryVariants(['US 10'])).toEqual(['10', 'US 10', 'US10']);
    expect(sizeMatches('10', ['US 10'])).toBe(true);
    expect(sizeMatches('US 9.5', ['9.5'])).toBe(true);
    expect(sizeMatches('11', ['10'])).toBe(false);
  });
  it('parses URL state including priceRange and sizes', () => {
    const p = parseFilterSearchParams(new URLSearchParams('priceRange=1,2&sizes=US 10,US 11&verifiedOnly=true&sort=price-asc'), { category: 'Sneakers' });
    expect(p.priceRange).toEqual([1, 2]);
    expect(p.sizes).toEqual(['10', '11']);
    expect(p.verifiedOnly).toBe(true);
    expect(p.category).toBe('Sneakers');
  });
  it('hides default/status/category chips and page presets', () => {
    const chips = activeFilterChips({ category: 'Sneakers', status: 'available', sort: 'price-asc', brand: 'Nike', priceRange: [1, 2], sizes: ['10'] }, { category: 'Sneakers', brand: 'Nike' });
    expect(chips.map((c) => c.label)).toEqual(['Price: $1–$2', 'Size: US 10']);
  });
  it('Clear all keeps the page and its category', () => {
    expect(clearFiltersHref('/shoes', new URLSearchParams('sizes=10&priceRange=1,2'))).toBe('/shoes');
    expect(clearFiltersHref('/browse', new URLSearchParams('category=Coins&sizes=10'))).toBe('/browse?category=Coins');
  });
  it('tailors facets and sort by category', () => {
    expect(facetsFor('Sneakers').size).toBe(true);
    expect(facetsFor('Sneakers').dealTiers).toBe(false);
    expect(facetsFor('Collector Cards').sneakerCondition).toBe(false);
    expect(facetsFor('Collector Cards').grading).toBe(true);
    expect(sortOptionsFor('Sneakers').map((o) => o.value)).not.toContain('title-asc');
    expect(sortOptionsFor('Collector Cards').map((o) => o.value)).toContain('year-desc');
  });
  it('price sort is numeric even for string prices', () => {
    const items = [{ price: 100 }, { price: '15' }, { price: 300 }, { price: '$3,400' }, { price: 5 }];
    expect(applyClientSort(items, 'price-desc').map((i) => i.price)).toEqual(['$3,400', 300, 100, '15', 5]);
    expect(applyClientSort(items, 'price-asc')[0].price).toBe(5);
  });
});
