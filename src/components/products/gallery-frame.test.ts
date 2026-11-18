import { describe, it, expect } from 'vitest';
import { getGalleryFrameClasses, getGalleryFrameKind } from './gallery-frame';

describe('listing gallery frame', () => {
  it('caps the phone photo box at 60svh for every category', () => {
    for (const cat of ['Collector Cards', 'Coins', 'Sneakers', undefined]) {
      expect(getGalleryFrameClasses(cat, false)).toContain('max-md:max-h-[60svh]');
    }
  });

  it('uses a 4:5 phone box for cards and keeps 5:7 from md up', () => {
    const cls = getGalleryFrameClasses('Collector Cards', true);
    expect(getGalleryFrameKind('Collector Cards')).toBe('card');
    expect(cls).toContain('aspect-[4/5]');
    expect(cls).toContain('md:aspect-[5/7]');
    expect(cls).toContain('lg:max-w-none');
  });

  it('keeps coins square', () => {
    const cls = getGalleryFrameClasses('Coins', false);
    expect(getGalleryFrameKind('Coins')).toBe('coin');
    expect(cls).toContain('aspect-square');
    expect(cls).not.toContain('aspect-[4/5]');
    expect(cls).toContain('lg:max-w-[68vh]');
  });
});
