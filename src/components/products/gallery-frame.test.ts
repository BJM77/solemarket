import { describe, it, expect } from 'vitest';
import { getGalleryFrameKind, getGalleryFrameSpec, phoneFrameHeight } from './gallery-frame';

// The rendered size on a phone is measured in e2e/flows/mobile-gallery.spec.ts.
describe('listing gallery frame', () => {
  it('cards: 4:5 on phones, 5:7 from tablet up', () => {
    expect(getGalleryFrameKind('Collector Cards')).toBe('card');
    expect(getGalleryFrameSpec('Collector Cards')).toEqual({ phoneAspect: 0.8, phoneMaxScreenHeight: 0.6, tabletAspect: 5 / 7 });
  });

  it('sneakers and other items: 4:5 on phones, square from tablet up', () => {
    for (const cat of ['Sneakers', undefined]) {
      expect(getGalleryFrameKind(cat)).toBe('other');
      expect(getGalleryFrameSpec(cat)).toEqual({ phoneAspect: 0.8, phoneMaxScreenHeight: 0.6, tabletAspect: 1 });
    }
  });

  it('coins stay square', () => {
    expect(getGalleryFrameKind('Coins')).toBe('coin');
    expect(getGalleryFrameSpec('Coins')).toMatchObject({ phoneAspect: 1, tabletAspect: 1 });
  });

  it('the phone box is never taller than 60% of the screen', () => {
    const card = getGalleryFrameSpec('Collector Cards');
    expect(phoneFrameHeight(card, 390, 844)).toBeCloseTo(487.5); // 4:5 fits under the cap
    expect(phoneFrameHeight(card, 430, 600)).toBe(360); // short screen: capped at 60%
    expect(phoneFrameHeight(getGalleryFrameSpec('Coins'), 390, 844)).toBe(390);
  });
});
