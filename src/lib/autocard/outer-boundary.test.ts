import { describe, it, expect } from 'vitest';
import { applyH, homography, type Pt, type Quad } from './geometry';
import { detectCard } from './detect';
import { locateCard } from './pipeline';
import { CaptureGate } from './gate';
import { warpQuad } from './warp';
import { toGray } from './detect';
import { borderBandOk, cardSignature, isClipped, shapeCheck, signatureDistance, SAME_FACE_DISTANCE } from './validate';

/** Synthetic card (63x88, r=3) with a silver border, a high-contrast artwork box and a text box. */
function insideCard(u: number, v: number, r = 3) {
  if (u < 0 || v < 0 || u > 63 || v > 88) return false;
  const cx = u < r ? r : u > 63 - r ? 63 - r : u, cy = v < r ? r : v > 88 - r ? 88 - r : v;
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}
type Face = (u: number, v: number) => number;
const pokemonFront: Face = (u, v) => {
  if (u < 3.5 || u > 59.5 || v < 3.5 || v > 84.5) return 175; // border
  if (u > 5 && u < 58 && v > 9 && v < 45) return ((Math.floor(u / 3) + Math.floor(v / 3)) % 2) ? 245 : 15; // artwork, strong edges
  if (u > 5 && u < 58 && v > 52 && v < 78) return 230; // text box
  return 110;
};
const swirlBack: Face = (u, v) => {
  if (u < 3.5 || u > 59.5 || v < 3.5 || v > 84.5) return 120;
  return 60 + 60 * Math.sin(Math.hypot(u - 31, v - 44) / 3);
};
function render(w: number, h: number, corners: Pt[], bg: number, face: Face): Uint8Array {
  const Hinv = homography(corners, [{ x: 0, y: 0 }, { x: 63, y: 0 }, { x: 63, y: 88 }, { x: 0, y: 88 }]);
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const p = applyH(Hinv, { x: x + (sx + 0.5) / 2, y: y + (sy + 0.5) / 2 });
      s += insideCard(p.x, p.y) ? face(p.x, p.y) : bg;
    }
    g[y * w + x] = s / 4;
  }
  return g;
}
function pose(w: number, h: number, scale: number, rot: number, cx = w / 2, cy = h / 2): Quad {
  const a = (rot * Math.PI) / 180;
  return [{ x: -31.5, y: -44 }, { x: 31.5, y: -44 }, { x: 31.5, y: 44 }, { x: -31.5, y: 44 }].map(({ x, y }) => ({
    x: cx + (x * Math.cos(a) - y * Math.sin(a)) * scale, y: cy + (x * Math.sin(a) + y * Math.cos(a)) * scale,
  })) as Quad;
}
const err = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y))) / Math.hypot(b[1].x - b[0].x, b[1].y - b[0].y);
const W = 480, H = 640;
const feed = (g: Uint8Array, d = detectCard(g, W, H, 'auto')) => {
  const gate = new CaptureGate(); let st = gate.update(d, 999, 0); for (let t = 100; t <= 1200; t += 100) st = gate.update(d, 999, t); return st;
};

describe('AutoCard locks onto the OUTER card boundary', () => {
  for (const [name, bg] of [['dark', 18], ['white', 238]] as const) for (const rot of [0, 6, -11]) {
    it(`${name} background, rot ${rot}°: outer corners within 1.5%`, () => {
      const truth = pose(W, H, 5, rot);
      const g = render(W, H, truth, bg, pokemonFront);
      const loc = locateCard(g, W, H, 'auto')!;
      expect(loc).not.toBeNull();
      expect(err(loc.quad, truth)).toBeLessThan(0.015);
      expect(feed(g).ok).toBe(true);
    });
  }
  it('rejects a skewed parallelogram', () => {
    const q: Quad = [{ x: 140, y: 140 }, { x: 330, y: 140 }, { x: 380, y: 500 }, { x: 190, y: 500 }];
    expect(shapeCheck(q)).not.toBeNull();
    const g = render(W, H, q, 18, pokemonFront);
    const st = feed(g);
    expect(st.ok).toBe(false);
  });
  it('rejects a card partly out of frame', () => {
    const truth = pose(W, H, 5, 0, W / 2, 150); // top edge above the frame
    expect(isClipped(truth, W, H)).toBe(true);
    const g = render(W, H, truth, 18, pokemonFront);
    const st = feed(g);
    expect(st.ok).toBe(false);
    if (!st.ok) expect(st.message).toMatch(/whole card/i);
  });
  it('rejects a crop that cuts through the artwork (post-warp border check)', () => {
    const truth = pose(W, H, 5, 0);
    const g = render(W, H, truth, 18, pokemonFront);
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = g[i]; rgba[i * 4 + 3] = 255; }
    const ok = toGray(warpQuad(rgba, W, H, truth, 252, 352), 252, 352);
    expect(borderBandOk(ok, 252, 352)).toBe(true);
    const c = { x: W / 2, y: H / 2 };
    const inner = truth.map((p) => ({ x: c.x + (p.x - c.x) * 0.72, y: c.y + (p.y - c.y) * 0.72 })) as Quad;
    const bad = toGray(warpQuad(rgba, W, H, inner, 252, 352), 252, 352);
    expect(borderBandOk(bad, 252, 352)).toBe(false);
  });
  it('treats an identical front/back as the same face, and a real back as different', () => {
    const a = render(252, 352, [{ x: 0, y: 0 }, { x: 252, y: 0 }, { x: 252, y: 352 }, { x: 0, y: 352 }], 0, pokemonFront);
    const a2 = render(252, 352, [{ x: 2, y: 1 }, { x: 251, y: 2 }, { x: 250, y: 351 }, { x: 1, y: 350 }], 0, pokemonFront);
    const b = render(252, 352, [{ x: 0, y: 0 }, { x: 252, y: 0 }, { x: 252, y: 352 }, { x: 0, y: 352 }], 0, swirlBack);
    expect(signatureDistance(cardSignature(a, 252, 352), cardSignature(a2, 252, 352))).toBeLessThan(SAME_FACE_DISTANCE);
    expect(signatureDistance(cardSignature(a, 252, 352), cardSignature(b, 252, 352))).toBeGreaterThan(SAME_FACE_DISTANCE);
  });
});
