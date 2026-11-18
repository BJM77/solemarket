import { describe, it, expect } from 'vitest';
import {
  CARD_FRAME_ASPECT,
  captureFrameKindFor,
  fitGuideRect,
  getCaptureFrameSpec,
  limitLongEdge,
  mapDisplayRectToSource,
} from './frame';

describe('captureFrameKindFor', () => {
  it('maps listing types and legacy capture modes', () => {
    expect(captureFrameKindFor('collector-cards')).toBe('card');
    expect(captureFrameKindFor('Collector Cards')).toBe('card');
    expect(captureFrameKindFor('card')).toBe('card');
    expect(captureFrameKindFor('coins')).toBe('coin');
    expect(captureFrameKindFor('Bullion')).toBe('coin');
    expect(captureFrameKindFor('sneakers')).toBe('shoe');
    expect(captureFrameKindFor('general')).toBe('general');
    expect(captureFrameKindFor(undefined)).toBe('general');
  });
});

describe('getCaptureFrameSpec', () => {
  it('uses a 2.5:3.5 portrait card guide and a round coin guide', () => {
    expect(getCaptureFrameSpec('card').aspect).toBeCloseTo(2.5 / 3.5);
    expect(getCaptureFrameSpec('coin')).toMatchObject({ aspect: 1, round: true });
    expect(getCaptureFrameSpec('shoe').aspect).toBeGreaterThan(1);
    expect(getCaptureFrameSpec('card').hint).toMatch(/plain background/i);
  });
});

describe('fitGuideRect', () => {
  it('is height-limited for a card guide on a wide preview and stays centred', () => {
    const r = fitGuideRect(1000, 600, CARD_FRAME_ASPECT);
    expect(r.height).toBeCloseTo(600 * 0.74);
    expect(r.width / r.height).toBeCloseTo(CARD_FRAME_ASPECT);
    expect(r.x + r.width / 2).toBeCloseTo(500);
    expect(r.y + r.height / 2).toBeCloseTo(300);
  });

  it('is width-limited for a shoe guide on a tall preview', () => {
    const r = fitGuideRect(400, 800, 4 / 3);
    expect(r.width).toBeCloseTo(400 * 0.86);
  });
});

describe('mapDisplayRectToSource', () => {
  it('maps through object-fit: cover cropping', () => {
    // 1920x1080 source shown in a 600x600 box: scale 600/1080, 1920 wide -> 1066.67 shown, offset -233.33
    const rect = { x: 200, y: 100, width: 200, height: 400 };
    const out = mapDisplayRectToSource({ sourceW: 1920, sourceH: 1080, displayW: 600, displayH: 600, rect, margin: 0 });
    const scale = 600 / 1080;
    expect(out.x).toBe(Math.round((200 + 233.333) / scale));
    expect(out.y).toBe(Math.round(100 / scale));
    expect(out.width).toBe(Math.round(200 / scale));
    expect(out.height).toBe(Math.round(400 / scale));
  });

  it('adds a margin and clamps to the source frame', () => {
    const out = mapDisplayRectToSource({
      sourceW: 1000, sourceH: 1000, displayW: 1000, displayH: 1000,
      rect: { x: 0, y: 100, width: 500, height: 800 }, margin: 0.1,
    });
    expect(out.x).toBe(0);
    expect(out.y).toBe(20);
    expect(out.width).toBe(550);
    expect(out.height).toBe(960);
  });
});

describe('limitLongEdge', () => {
  it('scales down to the long edge and never upscales', () => {
    expect(limitLongEdge(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    expect(limitLongEdge(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
