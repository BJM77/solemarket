import { describe, it, expect } from 'vitest';
import { toTypesenseFilter, toTypesenseSort, toAlgoliaFilters, productToSearchDocument, decodePageCursor, encodePageCursor } from './mapping';

describe('search mapping', () => {
  it('builds typesense filters', () => {
    expect(toTypesenseFilter({ category: 'Sneakers', sizes: ['10', '10.5'], priceRange: [100, 300], verifiedOnly: true }))
      .toBe('status:=available && category:=[`Sneakers`] && size:=[`10`,`10.5`] && isVerified:=true && price:[100..300]');
    expect(toTypesenseSort('price-asc')).toBe('price:asc');
    expect(toTypesenseSort()).toBe('_text_match:desc,createdAt:desc');
  });
  it('builds algolia filters', () => {
    const f = toAlgoliaFilters({ brand: 'Nike', conditions: ['New', 'Used'], priceRange: [0, 50] });
    expect(f.facetFilters).toEqual(['status:available', 'brand:Nike', ['condition:New', 'condition:Used']]);
    expect(f.numericFilters).toEqual(['price>=0', 'price<=50']);
  });
  it('maps products to flat docs', () => {
    const d = productToSearchDocument('p1', { title: 'Kobe 6', price: '250' as any, category: 'Sneakers', size: 10 as any, status: 'available', sellerId: 's', createdAt: { _seconds: 10 } as any });
    expect(d).toMatchObject({ id: 'p1', price: 250, size: '10', createdAt: 10000 });
  });
  it('round-trips page cursors', () => {
    expect(decodePageCursor(encodePageCursor(3))).toBe(3);
    expect(decodePageCursor('firestoreDocId')).toBe(1);
  });
});
