import { describe, it, expect } from 'vitest';
import { analyseFrame } from './frame-analysis';
import { detectCard, laplacianVariance, toGray } from './detect';
import { DetectClient } from './detect-client';

function rgbaCard(w: number, h: number) {
  const px = new Uint8ClampedArray(w * h * 4).fill(245);
  for (let y = 100; y < 330; y++) for (let x = 78; x < 243; x++) {
    const v = 90 + (((x >> 2) + (y >> 2)) % 2) * 30, i = (y * w + x) * 4; px[i] = px[i + 1] = px[i + 2] = v;
  }
  return px;
}

describe('analyseFrame', () => {
  it('finds the card and matches the raw detector + sharpness', () => {
    const w = 320, h = 427, px = rgbaCard(w, h);
    const a = analyseFrame(px, w, h, 'white', 'none');
    expect(a.d.quad).not.toBeNull();
    expect(a.light).toBeDefined();
    const g = toGray(px, w, h);
    expect(detectCard(g, w, h, 'white').fill).toBeCloseTo(a.d.fill, 6);
    const xs = a.d.quad!.map((p) => p.x), ys = a.d.quad!.map((p) => p.y);
    expect(a.sharp).toBeCloseTo(laplacianVariance(g, w, h, { x0: Math.min(...xs) | 0, y0: Math.min(...ys) | 0, x1: Math.max(...xs) | 0, y1: Math.max(...ys) | 0 }), 6);
  });
  it('DetectClient without a worker falls back to the same main-thread result', async () => {
    const w = 320, h = 427, px = rgbaCard(w, h);
    const ctx = { drawImage() {}, getImageData: () => ({ data: px }) } as unknown as CanvasRenderingContext2D;
    const c = new DetectClient();
    expect(c.usingWorker).toBe(false);
    const r = await c.analyse({} as CanvasImageSource, ctx, w, h, 'white', 'none');
    expect(r).toEqual(analyseFrame(px, w, h, 'white', 'none'));
  });
});
