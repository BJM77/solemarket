import { describe, it, expect } from 'vitest';
import {
  ZOOM_LEAVE_LENIENCY_PX,
  ZOOM_ZONE_RATIO,
  isInTopHoverZone,
  isOutsideImageWithLeniency,
  lensBackgroundPosition,
} from './geometry';

const rect = { left: 100, top: 50, width: 200, height: 400 };

describe('isInTopHoverZone', () => {
  it('is true in the top 20% of the image, including the zone edge', () => {
    // height 400 → zone is the first 80px (y 50..130)
    expect(isInTopHoverZone(150, 50, rect)).toBe(true);
    expect(isInTopHoverZone(100, 80, rect)).toBe(true);
    expect(isInTopHoverZone(300, 50 + rect.height * ZOOM_ZONE_RATIO, rect)).toBe(true);
  });

  it('is false below the zone, even when still on the image', () => {
    expect(isInTopHoverZone(150, 50 + rect.height * ZOOM_ZONE_RATIO + 1, rect)).toBe(false);
    expect(isInTopHoverZone(200, 300, rect)).toBe(false);
  });

  it('is false outside the image bounds', () => {
    expect(isInTopHoverZone(99, 60, rect)).toBe(false);
    expect(isInTopHoverZone(301, 60, rect)).toBe(false);
    expect(isInTopHoverZone(150, 49, rect)).toBe(false);
  });

  it('is false for an empty rect', () => {
    expect(isInTopHoverZone(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toBe(false);
  });
});

describe('isOutsideImageWithLeniency', () => {
  it('is false while the pointer is on the image', () => {
    expect(isOutsideImageWithLeniency(100, 50, rect)).toBe(false);
    expect(isOutsideImageWithLeniency(200, 250, rect)).toBe(false);
    expect(isOutsideImageWithLeniency(300, 450, rect)).toBe(false);
  });

  it(`is false within ${ZOOM_LEAVE_LENIENCY_PX}px of the image edges`, () => {
    expect(isOutsideImageWithLeniency(100 - ZOOM_LEAVE_LENIENCY_PX, 250, rect)).toBe(false);
    expect(isOutsideImageWithLeniency(300 + ZOOM_LEAVE_LENIENCY_PX, 250, rect)).toBe(false);
    expect(isOutsideImageWithLeniency(200, 50 - ZOOM_LEAVE_LENIENCY_PX, rect)).toBe(false);
    expect(isOutsideImageWithLeniency(200, 450 + ZOOM_LEAVE_LENIENCY_PX, rect)).toBe(false);
  });

  it(`is true more than ${ZOOM_LEAVE_LENIENCY_PX}px outside the image`, () => {
    expect(isOutsideImageWithLeniency(100 - ZOOM_LEAVE_LENIENCY_PX - 1, 250, rect)).toBe(true);
    expect(isOutsideImageWithLeniency(300 + ZOOM_LEAVE_LENIENCY_PX + 1, 250, rect)).toBe(true);
    expect(isOutsideImageWithLeniency(200, 50 - ZOOM_LEAVE_LENIENCY_PX - 1, rect)).toBe(true);
    expect(isOutsideImageWithLeniency(200, 450 + ZOOM_LEAVE_LENIENCY_PX + 1, rect)).toBe(true);
  });

  it('is true for an empty rect', () => {
    expect(isOutsideImageWithLeniency(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toBe(true);
  });
});

describe('lensBackgroundPosition', () => {
  it('maps the pointer to a 0–100% background position', () => {
    expect(lensBackgroundPosition(100, 50, rect)).toEqual({ x: 0, y: 0 });
    expect(lensBackgroundPosition(200, 250, rect)).toEqual({ x: 50, y: 50 });
    expect(lensBackgroundPosition(300, 450, rect)).toEqual({ x: 100, y: 100 });
  });
});
