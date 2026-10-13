import { describe, it, expect } from 'vitest';
import { matchesSavedSearch, sanitizeCriteria, describeCriteria, criteriaToQueryString } from './match';

const kobe = { title: 'Nike Kobe 6 Protro Grinch', brand: 'Nike', category: 'Sneakers', size: '10', condition: 'New', price: 320, status: 'available' };

describe('saved search matching', () => {
  it('matches on words, brand, size, price', () => {
    expect(matchesSavedSearch(kobe, { q: 'kobe grinch', sizes: ['10', '10.5'], priceRange: [0, 400] })).toBe(true);
    expect(matchesSavedSearch(kobe, { q: 'kobe 5' })).toBe(false);
    expect(matchesSavedSearch(kobe, { sizes: ['9'] })).toBe(false);
    expect(matchesSavedSearch(kobe, { priceRange: [0, 300] })).toBe(false);
    expect(matchesSavedSearch({ ...kobe, status: 'sold' }, {})).toBe(false);
  });
  it('sanitises URL params', () => {
    expect(sanitizeCriteria({ q: ' kobe ', sizes: '10,10.5', priceRange: '100,300', junk: 'x', verifiedOnly: 'true' }))
      .toEqual({ q: 'kobe', sizes: ['10', '10.5'], priceRange: [100, 300], verifiedOnly: true });
  });
  it('describes and serialises', () => {
    const c = { q: 'kobe', sizes: ['10'] };
    expect(describeCriteria(c)).toBe('"kobe" · size 10');
    expect(criteriaToQueryString(c)).toBe('q=kobe&sizes=10');
  });
});
