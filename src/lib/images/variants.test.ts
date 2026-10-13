import { describe, it, expect } from 'vitest';
import { variantPath, safeWebpFilename } from './variants';

describe('image variants', () => {
  it('builds webp variant paths', () => {
    expect(variantPath('products/u1/123-shoe.webp', 400)).toBe('products/u1/123-shoe-w400.webp');
    expect(variantPath('products/u1/123-shoe.jpg')).toBe('products/u1/123-shoe.webp');
  });
  it('sanitises filenames', () => {
    expect(safeWebpFilename('My Shoe (1).JPG', 5)).toBe('5-My_Shoe__1_.webp');
    expect(safeWebpFilename(undefined, 5)).toBe('5-image.webp');
  });
});
