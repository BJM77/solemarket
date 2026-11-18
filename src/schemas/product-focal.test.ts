import { describe, expect, it } from 'vitest';
import { productFormSchema } from './product';

const base = {
  title: 'Air Jordan 1',
  price: 180,
  category: 'Sneakers' as const,
  condition: 'New',
  imageUrls: ['https://firebasestorage.googleapis.com/v0/b/x/o/a.jpg?alt=media'],
};

describe('productFormSchema imageFocalPoints', () => {
  it('accepts and clamps out-of-range centre pins', () => {
    const parsed = productFormSchema.safeParse({
      ...base,
      imageFocalPoints: [{ x: 1.8, y: -0.4 }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.imageFocalPoints).toEqual([{ x: 1, y: 0 }]);
    }
  });

  it('allows listings with no centre pins', () => {
    expect(productFormSchema.safeParse(base).success).toBe(true);
  });
});
