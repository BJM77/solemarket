import { describe, it, expect } from 'vitest';
import { analyseLighting, GlareHint } from './lighting';
import { CaptureGate, gateConfigFor, GLARE_MESSAGE } from './gate';
import { GLARE_THRESHOLD } from './sleeve';
import { polygonArea, type Quad } from './geometry';
import type { Detection } from './detect';

const W = 320, H = 427;
const Q: Quad = [{ x: 65, y: 81 }, { x: 255, y: 81 }, { x: 255, y: 346 }, { x: 65, y: 346 }];
const det: Detection = { quad: Q, fill: polygonArea(Q) / (W * H), backgroundCoverage: 0.5, bgLuma: 20, width: W, height: H, clipped: false, surround: 1 };
function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/** Mid-grey card with mild texture on a dark mat; `paint` adds highlights. */
function frame(paint?: (g: Uint8Array) => void): Uint8Array {
  const g = new Uint8Array(W * H).fill(20);
  for (let y = 81; y < 346; y++) for (let x = 65; x < 255; x++) g[y * W + x] = 120 + ((x * 7 + y * 13) % 30);
  paint?.(g);
  return g;
}
const disc = (cx: number, cy: number, r: number) => (g: Uint8Array) => {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) g[y * W + x] = 255;
};
const sparkle = (count: number, seed = 5) => (g: Uint8Array) => {
  const rnd = lcg(seed);
  for (let k = 0; k < count; k++) { const x = 70 + ((rnd() * 180) | 0), y = 86 + ((rnd() * 255) | 0); g[y * W + x] = 255; }
};
const gateOn = (sleeve: 'none' | 'soft' | 'hard', g: Uint8Array) => new CaptureGate(gateConfigFor(sleeve)).update(det, 500, 0, analyseLighting(g, W, H, Q));

describe('glare detection (clustered highlights, not holo sparkle)', () => {
  it('a solid reflection blob triggers "Tilt away from the light"', () => {
    const l = analyseLighting(frame(disc(160, 200, 12)), W, H, Q);
    expect(l.glare).toBeGreaterThan(GLARE_THRESHOLD.none);
    expect(gateOn('none', frame(disc(160, 200, 12)))).toMatchObject({ ok: false, reason: 'glare', message: GLARE_MESSAGE });
  });
  it('scattered holo sparkle with MORE clipped pixels does not trigger', () => {
    const g = frame(sparkle(900));
    const l = analyseLighting(g, W, H, Q);
    expect(l.clippedShare).toBeGreaterThan(0.012); // more clipped pixels than the blob above
    expect(l.glare).toBeLessThan(GLARE_THRESHOLD.none);
    expect(gateOn('none', g).reason).not.toBe('glare');
  });
  it('clean card reports no glare', () => {
    expect(analyseLighting(frame(), W, H, Q).glare).toBe(0);
  });
  it('soft sleeve tolerates a slightly larger reflection than no sleeve', () => {
    const g = frame(disc(160, 200, 10)); // ~0.0063 of the card
    const l = analyseLighting(g, W, H, Q);
    expect(l.glare).toBeGreaterThan(GLARE_THRESHOLD.none);
    expect(l.glare).toBeLessThan(GLARE_THRESHOLD.soft);
    expect(gateOn('none', g).reason).toBe('glare');
    expect(gateOn('soft', g).reason).not.toBe('glare');
  });
  it('soft sleeve is stricter about glare along the card edge', () => {
    // thin sleeve reflection hugging the left edge: small overall, large inside the edge band
    const strip = (g: Uint8Array) => { for (let y = 160; y < 230; y++) for (let x = 67; x < 71; x++) g[y * W + x] = 255; };
    const g = frame(strip);
    const l = analyseLighting(g, W, H, Q);
    expect(l.glare).toBeLessThan(GLARE_THRESHOLD.soft);
    expect(gateOn('soft', g)).toMatchObject({ reason: 'glare' });
    expect(gateOn('soft', g).ok ? '' : (gateOn('soft', g) as any).message).toMatch(/edge/);
  });
  it('the on-screen hint has hysteresis so it does not flicker', () => {
    const h = new GlareHint();
    const t = GLARE_THRESHOLD.none;
    expect(h.update({ glare: t * 0.9, edgeGlare: 0 }, t)).toBe(false);
    expect(h.update({ glare: t * 1.2, edgeGlare: 0 }, t)).toBe(true);
    expect(h.update({ glare: t * 0.8, edgeGlare: 0 }, t)).toBe(true);  // still on
    expect(h.update({ glare: t * 0.4, edgeGlare: 0 }, t)).toBe(false); // off below 60%
    expect(h.update(undefined, t)).toBe(false);
  });
});
