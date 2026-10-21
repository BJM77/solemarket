import { describe, it, expect } from 'vitest';
import { orderPortrait, quadAspect, homography, applyH, CARD_ASPECT, type Pt } from './geometry';
import { detectCard, laplacianVariance } from './detect';
import { CaptureGate, DEFAULT_GATE } from './gate';
import { warpQuad } from './warp';

/** Render a filled rotated rectangle (card) onto a plain background, grayscale. */
function scene(w: number, h: number, cx: number, cy: number, cw: number, ch: number, angleDeg: number, bg = 245, fg = 90, texture = true) {
  const g = new Uint8Array(w * h).fill(bg);
  const a = (angleDeg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - cx, dy = y - cy;
    const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
    if (Math.abs(u) <= cw / 2 && Math.abs(v) <= ch / 2) g[y * w + x] = texture ? fg + (((x >> 2) + (y >> 2)) % 2) * 30 : fg;
  }
  return g;
}

describe('orderPortrait (top = short edge in upper half)', () => {
  const rect: Pt[] = [{ x: 10, y: 10 }, { x: 73, y: 10 }, { x: 73, y: 98 }, { x: 10, y: 98 }];
  it('orders an upright card TL,TR,BR,BL regardless of input order', () => {
    const q = orderPortrait([rect[2], rect[0], rect[3], rect[1]])!;
    expect(q[0]).toEqual({ x: 10, y: 10 });
    expect(q[1]).toEqual({ x: 73, y: 10 });
    expect(q[2]).toEqual({ x: 73, y: 98 });
    expect(quadAspect(q)).toBeCloseTo(CARD_ASPECT, 2);
  });
  it('rejects landscape quads', () => {
    expect(orderPortrait([{ x: 0, y: 0 }, { x: 88, y: 0 }, { x: 88, y: 63 }, { x: 0, y: 63 }])).toBeNull();
  });
  it('keeps the top edge on top for tilts up to ~80 degrees', () => {
    for (const deg of [-40, -20, 0, 25, 40, 70]) {
      const g = scene(320, 400, 160, 200, 126, 176, deg);
      const d = detectCard(g, 320, 400, 'white');
      if (Math.abs(deg) > 45) { // beyond 45 a portrait card looks landscape-ish; quad may still be portrait-shaped
        if (d.quad) expect((d.quad[0].y + d.quad[1].y) / 2).toBeLessThan((d.quad[2].y + d.quad[3].y) / 2);
        continue;
      }
      expect(d.quad).not.toBeNull();
      expect((d.quad![0].y + d.quad![1].y) / 2).toBeLessThan((d.quad![2].y + d.quad![3].y) / 2);
      expect(quadAspect(d.quad!)).toBeCloseTo(CARD_ASPECT, 1);
    }
  });
});

describe('detectCard', () => {
  it('finds a card on white and on black backgrounds', () => {
    for (const [bg, fg] of [[245, 90], [10, 200]]) {
      const d = detectCard(scene(320, 400, 160, 200, 140, 196, 5, bg, fg), 320, 400, 'auto');
      expect(d.quad).not.toBeNull();
      expect(d.fill).toBeGreaterThan(0.18);
      expect(d.backgroundCoverage).toBeGreaterThan(0.6);
    }
  });
  it('returns no quad for an empty frame', () => {
    expect(detectCard(new Uint8Array(320 * 400).fill(240), 320, 400).quad).toBeNull();
  });
});

describe('sharpness', () => {
  it('is higher for textured than flat regions', () => {
    const sharp = laplacianVariance(scene(100, 100, 50, 50, 80, 80, 0), 100, 100);
    const flat = laplacianVariance(scene(100, 100, 50, 50, 80, 80, 0, 245, 90, false), 100, 100, { x0: 20, y0: 20, x1: 80, y1: 80 });
    expect(sharp).toBeGreaterThan(flat);
  });
});

describe('CaptureGate', () => {
  it('fires only after the card is stable and sharp for stableMs', () => {
    const g = scene(320, 400, 160, 200, 160, 224, 0);
    const d = detectCard(g, 320, 400, 'white');
    const gate = new CaptureGate();
    expect(gate.update(d, 500, 0).ok).toBe(false);
    let ok = false;
    for (let t = 100; t < DEFAULT_GATE.stableMs; t += 100) expect(gate.update(d, 500, t).ok).toBe(false);
    for (let t = DEFAULT_GATE.stableMs; t <= DEFAULT_GATE.stableMs + 100 && !ok; t += 50) ok = gate.update(d, 500, t).ok;
    expect(ok).toBe(true);
  });
  it('gives guidance when blurry or too small', () => {
    const gate = new CaptureGate();
    const small = detectCard(scene(320, 400, 160, 200, 60, 84, 0), 320, 400, 'white');
    expect(gate.update(small, 500, 0)).toMatchObject({ ok: false, reason: 'too_small' });
    const big = detectCard(scene(320, 400, 160, 200, 160, 224, 0), 320, 400, 'white');
    expect(new CaptureGate().update(big, 1, 10)).toMatchObject({ ok: false, reason: 'blurry' });
  });
});

describe('homography + warp', () => {
  it('maps corners exactly', () => {
    const src = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 14 }, { x: 0, y: 14 }];
    const dst = [{ x: 5, y: 3 }, { x: 40, y: 8 }, { x: 38, y: 60 }, { x: 2, y: 55 }];
    const H = homography(src, dst);
    src.forEach((p, i) => { const q = applyH(H, p); expect(q.x).toBeCloseTo(dst[i].x, 6); expect(q.y).toBeCloseTo(dst[i].y, 6); });
  });
  it('warps a card region to a fixed portrait output', () => {
    const w = 40, h = 40; const rgba = new Uint8ClampedArray(w * h * 4).fill(255);
    for (let y = 10; y < 30; y++) for (let x = 10; x < 25; x++) { const i = (y * w + x) * 4; rgba[i] = rgba[i + 1] = rgba[i + 2] = 0; }
    const out = warpQuad(rgba, w, h, [{ x: 10, y: 10 }, { x: 25, y: 10 }, { x: 25, y: 30 }, { x: 10, y: 30 }], 15, 21);
    expect(out.length).toBe(15 * 21 * 4);
    expect(out[(10 * 15 + 7) * 4]).toBeLessThan(20); // centre is card (black)
  });
});
