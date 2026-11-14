import { describe, it, expect, vi } from 'vitest';
import {
  scaleToFit,
  encodeWithinLimit,
  isHeicFile,
  ScreenshotReadError,
  SCREENSHOT_MAX_EDGE,
  SCREENSHOT_MAX_DATA_URL_CHARS,
} from './screenshot-compress';

describe('scaleToFit', () => {
  it('shrinks a tall iPhone screenshot so the long edge is 1600px', () => {
    expect(scaleToFit(1179, 2556, SCREENSHOT_MAX_EDGE)).toEqual({ width: 738, height: 1600 });
  });

  it('shrinks landscape images by width', () => {
    expect(scaleToFit(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
  });

  it('never upscales small images', () => {
    expect(scaleToFit(600, 900, 1600)).toEqual({ width: 600, height: 900 });
  });

  it('handles bad dimensions', () => {
    expect(scaleToFit(0, 100, 1600)).toEqual({ width: 0, height: 0 });
  });
});

describe('encodeWithinLimit', () => {
  it('stays under React’s 1,000,000 character server action argument limit', () => {
    expect(SCREENSHOT_MAX_DATA_URL_CHARS).toBeLessThan(1_000_000);
  });

  it('returns the first encoding that fits', () => {
    const encode = vi.fn((w: number, h: number, q: number) => 'x'.repeat(100));
    expect(encodeWithinLimit(1179, 2556, encode, 1000)).toHaveLength(100);
    expect(encode).toHaveBeenCalledTimes(1);
    expect(encode).toHaveBeenCalledWith(738, 1600, 0.85);
  });

  it('lowers quality, then size, until the result fits', () => {
    // Size proportional to pixels * quality: only fits once smaller sizes are tried.
    const encode = vi.fn((w: number, h: number, q: number) => 'x'.repeat(Math.round(w * h * q)));
    const limit = 400_000;
    const out = encodeWithinLimit(1179, 2556, encode, limit);
    expect(out.length).toBeLessThanOrEqual(limit);
    expect(encode.mock.calls.length).toBeGreaterThan(1);
  });

  it('throws a friendly error when nothing fits', () => {
    expect(() => encodeWithinLimit(1179, 2556, () => 'x'.repeat(10_000), 10)).toThrow(ScreenshotReadError);
  });
});

describe('isHeicFile', () => {
  it('detects HEIC by type or extension', () => {
    expect(isHeicFile({ type: 'image/heic', name: 'a' })).toBe(true);
    expect(isHeicFile({ type: '', name: 'IMG_1.HEIC' })).toBe(true);
    expect(isHeicFile({ type: 'image/png', name: 'shot.png' })).toBe(false);
  });
});
