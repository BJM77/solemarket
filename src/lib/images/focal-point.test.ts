import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FOCAL_POINT,
  clampFocalCoord,
  clientPointToFocal,
  containedImageRect,
  getImageFocalPoint,
  hasSellerFocal,
  normalizeFocalPoint,
  padFocalPoints,
  productCoverStyle,
  sanitizeImageFocalPoints,
  focalObjectPosition,
} from './focal-point';

describe('clampFocalCoord', () => {
  it('clamps to 0–1 and falls back for junk', () => {
    expect(clampFocalCoord(-2)).toBe(0);
    expect(clampFocalCoord(1.4)).toBe(1);
    expect(clampFocalCoord(0.25)).toBe(0.25);
    expect(clampFocalCoord('0.8')).toBe(0.8);
    expect(clampFocalCoord('nope')).toBe(0.5);
    expect(clampFocalCoord(NaN)).toBe(0.5);
    expect(clampFocalCoord(undefined)).toBe(0.5);
  });
});

describe('normalizeFocalPoint / getImageFocalPoint', () => {
  it('defaults missing values to the centre', () => {
    expect(normalizeFocalPoint(null)).toEqual(DEFAULT_FOCAL_POINT);
    expect(getImageFocalPoint(undefined, 0)).toEqual(DEFAULT_FOCAL_POINT);
    expect(getImageFocalPoint([], 0)).toEqual(DEFAULT_FOCAL_POINT);
    expect(getImageFocalPoint([{ x: 0.2, y: 0.8 }], 0)).toEqual({ x: 0.2, y: 0.8 });
    expect(getImageFocalPoint([{ x: 0.2, y: 0.8 }], 1)).toEqual(DEFAULT_FOCAL_POINT);
  });

  it('clamps each axis independently', () => {
    expect(normalizeFocalPoint({ x: 2, y: -1 })).toEqual({ x: 1, y: 0 });
  });
});

describe('sanitizeImageFocalPoints', () => {
  it('leaves documents without a sender array untouched', () => {
    expect(sanitizeImageFocalPoints(undefined, 3)).toBeUndefined();
    expect(sanitizeImageFocalPoints(null, 3)).toBeUndefined();
    expect(sanitizeImageFocalPoints({ x: 0.2, y: 0.3 }, 1)).toBeUndefined();
    expect(sanitizeImageFocalPoints([], 0)).toBeUndefined();
  });

  it('pads, trims, and clamps to the image count', () => {
    expect(sanitizeImageFocalPoints([{ x: 0.1, y: 0.2 }], 3)).toEqual([
      { x: 0.1, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
    ]);
    expect(sanitizeImageFocalPoints([{ x: 9, y: -2 }, { x: 0.3, y: 0.4 }, { x: 0.1, y: 0.1 }], 2)).toEqual([
      { x: 1, y: 0 },
      { x: 0.3, y: 0.4 },
    ]);
  });
});

describe('padFocalPoints', () => {
  it('always returns one entry per image', () => {
    expect(padFocalPoints(undefined, 2)).toEqual([DEFAULT_FOCAL_POINT, DEFAULT_FOCAL_POINT]);
    expect(padFocalPoints([{ x: 0, y: 1 }], 1)).toEqual([{ x: 0, y: 1 }]);
  });
});

describe('productCoverStyle', () => {
  it('prefers a seller-set pin over AI smartCrop', () => {
    const style = productCoverStyle({
      imageFocalPoints: [{ x: 0.2, y: 0.8 }],
      aiIntelligence: [{ smartCrop: { x: 0.9, y: 0.1 } }],
    }, 0);
    expect(style.objectPosition).toBe('20% 80%');
    expect(style.transformOrigin).toBe('20% 80%');
  });

  it('falls back to AI smartCrop, then centre, for listings without a pin', () => {
    expect(productCoverStyle({
      aiIntelligence: [{ smartCrop: { x: 0.25, y: 0.75 } }],
    }, 0).objectPosition).toBe('25% 75%');
    expect(productCoverStyle({}, 0).objectPosition).toBe('50% 50%');
    expect(hasSellerFocal(undefined, 0)).toBe(false);
  });
});

describe('focalObjectPosition', () => {
  it('formats CSS percentages from a parallel array', () => {
    expect(focalObjectPosition([{ x: 0, y: 1 }], 0)).toBe('0% 100%');
  });
});

describe('containedImageRect / clientPointToFocal', () => {
  it('letterboxes a landscape image in a square and maps clicks onto the photo', () => {
    const r = containedImageRect(100, 100, 200, 100);
    expect(r).toEqual({ left: 0, top: 25, width: 100, height: 50 });
    // Click the visual top-left of the photo.
    expect(clientPointToFocal(0, 25, { left: 0, top: 0, width: 100, height: 100 }, 200, 100)).toEqual({ x: 0, y: 0 });
    // Click the centre of the photo.
    expect(clientPointToFocal(50, 50, { left: 0, top: 0, width: 100, height: 100 }, 200, 100)).toEqual({ x: 0.5, y: 0.5 });
    // Click in the letterbox above the photo — clamp to the top edge.
    expect(clientPointToFocal(50, 5, { left: 0, top: 0, width: 100, height: 100 }, 200, 100)).toEqual({ x: 0.5, y: 0 });
  });

  it('letterboxes a portrait image in a square', () => {
    const r = containedImageRect(100, 100, 100, 200);
    expect(r).toEqual({ left: 25, top: 0, width: 50, height: 100 });
  });
});
