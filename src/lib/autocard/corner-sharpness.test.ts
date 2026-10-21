import { describe, it, expect } from 'vitest';
import type { Quad } from './geometry';
import { cornerSharpness } from './corner-sharpness';

/** Textured card on a white background, gray. */
function card(w: number, h: number, q: [number, number, number, number]) {
  const g = new Uint8Array(w * h).fill(240);
  for (let y = q[1]; y < q[3]; y++) for (let x = q[0]; x < q[2]; x++) g[y * w + x] = 80 + (((x >> 1) + (y >> 1)) % 2) * 60;
  return g;
}
function boxBlur(g: Uint8Array, w: number, h: number, x0: number, y0: number, x1: number, y1: number, r = 4) {
  const src = g.slice();
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    let s = 0, n = 0;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = Math.min(w - 1, Math.max(0, x + dx)), yy = Math.min(h - 1, Math.max(0, y + dy)); s += src[yy * w + xx]; n++;
    }
    g[y * w + x] = s / n;
  }
}

describe('cornerSharpness', () => {
  const w = 320, h = 427, r: [number, number, number, number] = [70, 60, 250, 311];
  const quad: Quad = [{ x: r[0], y: r[1] }, { x: r[2], y: r[1] }, { x: r[2], y: r[3] }, { x: r[0], y: r[3] }];
  it('passes a uniformly sharp card', () => {
    const res = cornerSharpness(card(w, h, r), w, h, quad);
    expect(res.blurry).toBe(false);
    expect(res.ratio).toBeGreaterThan(0.2);
  });
  it('flags one motion-blurred corner', () => {
    const g = card(w, h, r);
    boxBlur(g, w, h, r[2] - 30, r[3] - 30, r[2] + 30, r[3] + 30);
    const res = cornerSharpness(g, w, h, quad);
    expect(res.blurry).toBe(true);
    expect(res.corners.indexOf(res.worst)).toBe(2);
  });
  it('passes a card blurred evenly everywhere (no corner is worse than the centre)', () => {
    const g = card(w, h, r);
    boxBlur(g, w, h, 0, 0, w, h, 1);
    expect(cornerSharpness(g, w, h, quad).blurry).toBe(false);
  });
});
