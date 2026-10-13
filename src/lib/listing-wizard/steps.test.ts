import { describe, it, expect } from 'vitest';
import { validateStep, draftToProduct, EMPTY_DRAFT, SHOT_LISTS } from './steps';
import { productFormSchema } from '@/schemas/product';

const full = {
  ...EMPTY_DRAFT,
  category: 'Sneakers' as const,
  photos: { side: 'https://firebasestorage.googleapis.com/a.webp', pair: 'https://firebasestorage.googleapis.com/b.webp', tag: 'https://firebasestorage.googleapis.com/c.webp' },
  title: 'Nike Kobe 6 Protro Grinch',
  size: '10',
  condition: 'New',
  price: '320',
};

describe('listing wizard', () => {
  it('requires the guided shots', () => {
    expect(validateStep('photos', { ...full, photos: {} })).toHaveLength(SHOT_LISTS.Sneakers.filter((s) => s.required).length);
    expect(validateStep('photos', full)).toEqual([]);
  });
  it('validates details and price', () => {
    expect(validateStep('details', { ...full, size: '' })).toContain('Add the US size.');
    expect(validateStep('price', { ...full, price: '0' })).toContain('Enter a price of at least $1.');
    expect(validateStep('review', full)).toEqual([]);
  });
  it('produces a payload accepted by the server schema, photos in shot order', () => {
    const p = draftToProduct(full);
    expect(p.imageUrls[2]).toContain('c.webp');
    expect(productFormSchema.safeParse(p).success).toBe(true);
  });
});

import { describe as d2, it as i2, expect as e2 } from 'vitest';
d2('wizard multibuy step', () => {
  i2('validates tiers and maps them to the product', () => {
    const base = { ...EMPTY_DRAFT, multibuyEnabled: true, multibuyTiers: [{ minQuantity: 5, discountPercent: 95 }] };
    e2(validateStep('multibuy', base).join(' ')).toMatch(/90%/);
    e2(validateStep('multibuy', { ...base, multibuyTiers: [] }).length).toBeGreaterThan(0);
    const ok = { ...base, multibuyTiers: [{ minQuantity: 5, discountPercent: 20 }, { minQuantity: 2, discountPercent: 5 }] };
    e2(validateStep('multibuy', ok)).toEqual([]);
    e2((draftToProduct({ ...ok, category: 'Collector Cards' }) as any).multibuyTiers[0].minQuantity).toBe(2);
    e2((draftToProduct({ ...EMPTY_DRAFT, category: 'Collector Cards' }) as any).multibuyEnabled).toBeUndefined();
  });
});
