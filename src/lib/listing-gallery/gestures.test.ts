import { describe, it, expect } from 'vitest';
import {
  DOUBLE_TAP_DISTANCE_PX,
  DOUBLE_TAP_MS,
  DOUBLE_TAP_SCALE,
  IDENTITY,
  MAX_SCALE,
  SWIPE_CLOSE_PX,
  SWIPE_PHOTO_PX,
  classifySwipe,
  clampPan,
  clampScale,
  counterLabel,
  distance,
  doubleTapTransform,
  isDoubleTap,
  isTap,
  isZoomed,
  layoutOrigin,
  midpoint,
  panTransform,
  pinchTransform,
  untransformedSize,
  wrapIndex,
} from './gestures';

const origin = { x: 200, y: 300 };

describe('distance and midpoint', () => {
  it('measures the gap and the halfway point between two touches', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 10 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 5 });
  });
});

describe('clampScale', () => {
  it('stays between 1× and the max zoom, and treats non-finite values as 1×', () => {
    expect(clampScale(0.2)).toBe(1);
    expect(clampScale(2)).toBe(2);
    expect(clampScale(99)).toBe(MAX_SCALE);
    expect(clampScale(Number.NaN)).toBe(1);
  });
});

describe('isZoomed', () => {
  it('is false at 1× and true once the scale is meaningfully above it', () => {
    expect(isZoomed(1)).toBe(false);
    expect(isZoomed(1.005)).toBe(false);
    expect(isZoomed(1.5)).toBe(true);
  });
});

describe('pinchTransform', () => {
  it('zooms around the centre without translating', () => {
    const next = pinchTransform(
      { ...IDENTITY, midpoint: origin },
      origin,
      2,
      origin,
    );
    expect(next.scale).toBe(2);
    expect(next.x).toBeCloseTo(0);
    expect(next.y).toBeCloseTo(0);
  });

  it('keeps the focal point under the fingers when pinching off-centre', () => {
    const mid = { x: 250, y: 300 };
    const next = pinchTransform({ ...IDENTITY, midpoint: mid }, mid, 2, origin);
    expect(next.scale).toBe(2);
    expect(next.x).toBeCloseTo(-50);
    expect(next.y).toBeCloseTo(0);
    // Visual position of the original midpoint: origin + translate + local * scale
    expect(origin.x + next.x + 50 * next.scale).toBeCloseTo(mid.x);
  });

  it('follows the midpoint if both fingers slide together while pinching', () => {
    const startMid = { x: 200, y: 300 };
    const currentMid = { x: 220, y: 310 };
    const next = pinchTransform({ ...IDENTITY, midpoint: startMid }, currentMid, 2, origin);
    expect(next.scale).toBe(2);
    expect(origin.x + next.x + 0 * next.scale).toBeCloseTo(currentMid.x);
    expect(origin.y + next.y + 0 * next.scale).toBeCloseTo(currentMid.y);
  });

  it('does not exceed the maximum scale', () => {
    const next = pinchTransform({ ...IDENTITY, midpoint: origin }, origin, 20, origin);
    expect(next.scale).toBe(MAX_SCALE);
  });
});

describe('panTransform', () => {
  it('moves the image by the pointer delta and keeps the scale', () => {
    const next = panTransform({ scale: 2, x: 10, y: -4 }, { x: 5, y: 5 }, { x: 15, y: 0 });
    expect(next).toEqual({ scale: 2, x: 20, y: -9 });
  });
});

describe('doubleTapTransform', () => {
  it('zooms in around the tap so the same point stays under the finger', () => {
    const tap = { x: 250, y: 300 };
    const next = doubleTapTransform(IDENTITY, tap, origin);
    expect(next.scale).toBe(DOUBLE_TAP_SCALE);
    expect(origin.x + next.x + 50 * next.scale).toBeCloseTo(tap.x);
    expect(origin.y + next.y + 0 * next.scale).toBeCloseTo(tap.y);
  });

  it('resets to 1× when already zoomed', () => {
    expect(doubleTapTransform({ scale: 2.5, x: -40, y: 10 }, origin, origin)).toEqual(IDENTITY);
  });
});

describe('clampPan', () => {
  const viewport = { width: 200, height: 400 };
  const image = { width: 200, height: 400 };

  it('forces the pan to the origin at 1× when the image already fits', () => {
    expect(clampPan({ scale: 1, x: 40, y: -20 }, viewport, image)).toEqual(IDENTITY);
  });

  it('limits the pan to half the overflow when zoomed', () => {
    // scale 2 → overflow 200×400, max pan 100×200
    expect(clampPan({ scale: 2, x: 40, y: -20 }, viewport, image)).toEqual({ scale: 2, x: 40, y: -20 });
    expect(clampPan({ scale: 2, x: 400, y: -500 }, viewport, image)).toEqual({ scale: 2, x: 100, y: -200 });
  });
});

describe('classifySwipe', () => {
  it('is a photo swipe when the horizontal move clears the threshold', () => {
    expect(classifySwipe(-SWIPE_PHOTO_PX, 10)).toBe('left');
    expect(classifySwipe(SWIPE_PHOTO_PX, -8)).toBe('right');
  });

  it('is a close swipe when the downward move clears the threshold', () => {
    expect(classifySwipe(10, SWIPE_CLOSE_PX)).toBe('down');
  });

  it('is ignored when the move is too small or an upward flick', () => {
    expect(classifySwipe(20, 20)).toBeNull();
    expect(classifySwipe(0, -SWIPE_CLOSE_PX)).toBe('up');
  });
});

describe('isDoubleTap and isTap', () => {
  const point = { x: 10, y: 10 };

  it('recognises a second tap in time and close to the first', () => {
    expect(isDoubleTap({ time: 100, point }, { time: 100 + DOUBLE_TAP_MS, point })).toBe(true);
    expect(isDoubleTap({ time: 100, point }, { time: 100 + DOUBLE_TAP_MS + 1, point })).toBe(false);
    expect(isDoubleTap(
      { time: 100, point },
      { time: 200, point: { x: point.x + DOUBLE_TAP_DISTANCE_PX + 1, y: point.y } },
    )).toBe(false);
    expect(isDoubleTap(null, { time: 100, point })).toBe(false);
  });

  it('treats a short move as a tap', () => {
    expect(isTap(point, { x: 12, y: 10 })).toBe(true);
    expect(isTap(point, { x: 80, y: 10 })).toBe(false);
  });
});

describe('wrapIndex, counterLabel, layout helpers', () => {
  it('wraps photo indexes in both directions', () => {
    expect(wrapIndex(0, 5, -1)).toBe(4);
    expect(wrapIndex(4, 5, 1)).toBe(0);
    expect(wrapIndex(2, 5, 1)).toBe(3);
    expect(wrapIndex(0, 0, 1)).toBe(0);
  });

  it('formats the visible counter as "current / total"', () => {
    expect(counterLabel(1, 5)).toBe('2 / 5');
    expect(counterLabel(0, 1)).toBe('1 / 1');
    expect(counterLabel(0, 0)).toBe('0 / 0');
  });

  it('recovers the untransformed centre and size from a transformed box', () => {
    const transform = { scale: 2, x: 10, y: -4 };
    const rect = { left: 40, top: 80, width: 200, height: 400 };
    expect(layoutOrigin(rect, transform)).toEqual({ x: 140 - 10, y: 280 + 4 });
    expect(untransformedSize(rect, 2)).toEqual({ width: 100, height: 200 });
  });
});
