import { describe, it, expect } from 'vitest';
import { applyH, homography, perspectiveDeg, CARD_ASPECT, type Pt, type Quad } from './geometry';
import { locateCard } from './pipeline';
import { verifyAndCorrect } from './refine';
import { warpQuad, OUTPUT_W, OUTPUT_H } from './warp';
import { analyseLighting, normaliseColour } from './lighting';
import { CaptureGate } from './gate';
import { detectCard } from './detect';

/** Card space: 63 x 88 units with 3-unit corner radius. Rendered with 3x3 supersampling. */
function insideCard(u: number, v: number, r = 3): boolean {
  if (u < 0 || v < 0 || u > 63 || v > 88) return false;
  const cx = u < r ? r : u > 63 - r ? 63 - r : u, cy = v < r ? r : v > 88 - r ? 88 - r : v;
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}
function render(w: number, h: number, corners: Quad, bg = 240, fg = 70, extra?: (u: number, v: number) => number | null) {
  const Hinv = homography(corners, [{ x: 0, y: 0 }, { x: 63, y: 0 }, { x: 63, y: 88 }, { x: 0, y: 88 }]);
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) {
      const p = applyH(Hinv, { x: x + (sx + 0.5) / 3, y: y + (sy + 0.5) / 3 });
      if (insideCard(p.x, p.y)) { const e = extra?.(p.x, p.y); s += e ?? fg + ((Math.floor(p.x / 4) + Math.floor(p.y / 4)) % 2) * 25; } else s += bg;
    }
    g[y * w + x] = s / 9;
  }
  return g;
}
/** Card corners for a rotation + perspective tilt. */
function pose(w: number, h: number, scale: number, rotDeg: number, tiltX: number, tiltY: number): Quad {
  const a = (rotDeg * Math.PI) / 180;
  const base: Pt[] = [{ x: -31.5, y: -44 }, { x: 31.5, y: -44 }, { x: 31.5, y: 44 }, { x: -31.5, y: 44 }];
  return base.map(({ x, y }) => {
    const k = 1 + tiltX * x + tiltY * y; // projective foreshortening
    const X = (x * Math.cos(a) - y * Math.sin(a)) * scale / k, Y = (x * Math.sin(a) + y * Math.cos(a)) * scale / k;
    return { x: w / 2 + X, y: h / 2 + Y };
  }) as Quad;
}
const cornerErr = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));
const width = (q: Quad) => Math.hypot(q[1].x - q[0].x, q[1].y - q[0].y);

describe('precise corners on rounded, tilted cards', () => {
  const W = 640, H = 860;
  const cases: [number, number, number][] = [[0, 0, 0], [8, 0.002, 0], [-15, 0, 0.0025], [25, -0.002, 0.0015], [-35, 0.0015, -0.002]];
  for (const [rot, tx, ty] of cases) {
    it(`rot ${rot}° tilt ${tx}/${ty}: corner error < 1.5% and rectified aspect within 1%`, () => {
      const truth = pose(W, H, 5.6, rot, tx, ty);
      const g = render(W, H, truth);
      const loc = locateCard(g, W, H, 'white')!;
      expect(loc).not.toBeNull();
      expect(loc.refined).toBe(true);
      expect(cornerErr(loc.quad, truth) / width(truth)).toBeLessThan(0.015);
      expect(Math.abs(loc.aspect - CARD_ASPECT) / CARD_ASPECT).toBeLessThan(0.01);
    });
  }
  it('is much more accurate than the raw hull quad', () => {
    const truth = pose(W, H, 5.6, 12, 0.002, 0.001);
    const g = render(W, H, truth);
    const loc = locateCard(g, W, H, 'white')!;
    expect(cornerErr(loc.quad, truth)).toBeLessThan(2.5);
  });
});

describe('output', () => {
  it('is exactly 63:88 portrait', () => {
    expect(OUTPUT_W / OUTPUT_H).toBeCloseTo(63 / 88, 10);
  });
  it('verifyAndCorrect fixes a quad that is ~2% off', () => {
    const W = 480, H = 640, truth = pose(W, H, 5.5, 5, 0.001, 0);
    const g = render(W, H, truth);
    const bad = truth.map((p, i) => ({ x: p.x + (i % 2 ? 6 : -4), y: p.y + (i > 1 ? 5 : -3) })) as Quad;
    const v = verifyAndCorrect(g, W, H, bad);
    expect(v.corrected).toBe(true);
    expect(v.error).toBeLessThan(0.01);
    expect(cornerErr(v.quad, truth) / width(truth)).toBeLessThan(0.015);
  });
  it('warped card fills the output with straight borders', () => {
    const W = 480, H = 640, truth = pose(W, H, 5.5, -10, 0.002, 0.001);
    const g = render(W, H, truth, 240, 70);
    const loc = locateCard(g, W, H, 'white')!;
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = g[i]; rgba[i * 4 + 3] = 255; }
    const ow = 126, oh = 176, out = warpQuad(rgba, W, H, loc.quad, ow, oh);
    // mid-edge pixels 2px inside each border must be card (dark), not background
    for (const [x, y] of [[ow / 2, 2], [ow / 2, oh - 3], [2, oh / 2], [ow - 3, oh / 2]]) expect(out[(y * ow + x) * 4]).toBeLessThan(160);
  });
});

describe('tilt gate', () => {
  it('perspectiveDeg is ~0 flat and grows with tilt', () => {
    expect(perspectiveDeg(pose(600, 800, 6, 10, 0, 0))).toBeLessThan(0.01);
    expect(perspectiveDeg(pose(600, 800, 6, 0, 0, 0.004))).toBeGreaterThan(3.5);
  });
  it('blocks capture with "Level your phone over the card"', () => {
    const W = 320, H = 430;
    const g = render(W, H, pose(W, H, 3.0, 0, 0, 0.0035));
    const d = detectCard(g, W, H, 'white');
    expect(d.quad).not.toBeNull();
    expect(new CaptureGate().update(d, 500, 0)).toMatchObject({ ok: false, reason: 'tilted', message: 'Level your phone over the card' });
  });
});

describe('lighting', () => {
  const W = 320, H = 430, q = pose(W, H, 3.6, 0, 0, 0);
  it('detects glare and blocks capture', () => {
    const g = render(W, H, q, 240, 90, (u, v) => ((u - 30) ** 2 + (v - 40) ** 2 < 64 ? 255 : null));
    const d = detectCard(g, W, H, 'white');
    const l = analyseLighting(g, W, H, d.quad!);
    expect(l.glare).toBeGreaterThan(0.01);
    expect(new CaptureGate().update(d, 500, 0, l)).toMatchObject({ reason: 'glare', message: 'Tilt away from the light' });
    const clean = render(W, H, q, 240, 90);
    expect(analyseLighting(clean, W, H, detectCard(clean, W, H, 'white').quad!).glare).toBeLessThan(0.001);
  });
  it('detects low light', () => {
    const g = render(W, H, q, 58, 0, () => 10);
    const d = detectCard(g, W, H, 'auto');
    expect(d.quad).not.toBeNull();
    const l = analyseLighting(g, W, H, d.quad!);
    expect(new CaptureGate().update(d, 500, 0, l)).toMatchObject({ reason: 'low_light', message: 'Need more light' });
  });
  it('gray-world balance neutralises a colour cast and evens exposure', () => {
    const mk = (r: number, g: number, b: number) => { const p = new Uint8ClampedArray(64 * 64 * 4); for (let i = 0; i < p.length; i += 4) { const t = ((i >> 2) % 64) / 64; p[i] = r * (0.5 + t); p[i + 1] = g * (0.5 + t); p[i + 2] = b * (0.5 + t); p[i + 3] = 255; } return p; };
    const mean = (p: Uint8ClampedArray, c: number) => { let s = 0; for (let i = c; i < p.length; i += 4) s += p[i]; return s / (p.length / 4); };
    const warm = normaliseColour(mk(160, 130, 100)), dim = normaliseColour(mk(80, 85, 90));
    for (const p of [warm, dim]) expect(Math.max(mean(p, 0), mean(p, 1), mean(p, 2)) - Math.min(mean(p, 0), mean(p, 1), mean(p, 2))).toBeLessThan(6);
    expect(Math.abs(mean(warm, 1) - mean(dim, 1))).toBeLessThan(25);
  });
});
