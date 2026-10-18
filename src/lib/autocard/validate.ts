import { CARD_ASPECT, dist, quadAspect, type Pt, type Quad } from './geometry';

/**
 * Card-shape and context checks that stop AutoCard from accepting an inner
 * artwork/text-box rectangle, a skewed partial edge, or a card cut off by the frame.
 * Pure functions on gray images; unit tested.
 */

/** Interior angles (degrees) at TL, TR, BR, BL. */
export function interiorAngles(q: Quad): number[] {
  return q.map((p, i) => {
    const a = q[(i + 3) % 4], b = q[(i + 1) % 4];
    const u = { x: a.x - p.x, y: a.y - p.y }, v = { x: b.x - p.x, y: b.y - p.y };
    const c = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1);
    return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  });
}

export interface ShapeLimits { maxAngleDev: number; maxOppositeRatio: number; aspectTol: number }
export const DEFAULT_SHAPE: ShapeLimits = { maxAngleDev: 8, maxOppositeRatio: 0.06, aspectTol: 0.03 };

export type ShapeFail = 'angles' | 'opposite' | 'aspect' | null;

/** null when the quad is a plausible straight-on card; otherwise the failed rule. */
export function shapeCheck(q: Quad, lim: ShapeLimits = DEFAULT_SHAPE): ShapeFail {
  if (interiorAngles(q).some((a) => !Number.isFinite(a) || Math.abs(a - 90) > lim.maxAngleDev)) return 'angles';
  const ratio = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b, 1e-9);
  const top = dist(q[0], q[1]), bot = dist(q[3], q[2]), left = dist(q[0], q[3]), right = dist(q[1], q[2]);
  if (ratio(top, bot) > lim.maxOppositeRatio || ratio(left, right) > lim.maxOppositeRatio) return 'opposite';
  if (Math.abs(quadAspect(q) - CARD_ASPECT) > lim.aspectTol) return 'aspect';
  return null;
}

/** True when any corner is within `marginFrac` of the frame edge (card probably cut off). */
export function isClipped(q: Quad, w: number, h: number, marginFrac = 0.02): boolean {
  const m = Math.max(2, Math.min(w, h) * marginFrac);
  return q.some((p) => p.x < m || p.y < m || p.x > w - m || p.y > h - m);
}

function sample(g: Uint8Array, w: number, h: number, x: number, y: number): number {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return -1;
  return g[yi * w + xi];
}

/**
 * Band test around each edge: a band just OUTSIDE the edge must look like the
 * background, and a band just INSIDE must differ from it. An inner artwork box fails
 * because its outside band is card border, not background.
 * Returns the share of samples (0-1) matching expectations for the worst edge.
 */
export function surroundScore(g: Uint8Array, w: number, h: number, q: Quad, bgLuma: number, opts: { band?: number; tol?: number } = {}): number {
  const c = { x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4 };
  const diag = Math.hypot(q[2].x - q[0].x, q[2].y - q[0].y);
  const band = opts.band ?? Math.max(2, diag * 0.015), tol = opts.tol ?? 40;
  let worst = 1;
  for (let i = 0; i < 4; i++) {
    const A = q[i], B = q[(i + 1) % 4];
    const ex = B.x - A.x, ey = B.y - A.y, L = Math.hypot(ex, ey) || 1;
    let nx = -ey / L, ny = ex / L;
    if (((A.x + B.x) / 2 - c.x) * nx + ((A.y + B.y) / 2 - c.y) * ny < 0) { nx = -nx; ny = -ny; }
    let good = 0, n = 0;
    for (let k = 0; k < 24; k++) {
      const t = 0.15 + (0.7 * (k + 0.5)) / 24;
      const P: Pt = { x: A.x + ex * t, y: A.y + ey * t };
      const out = sample(g, w, h, P.x + nx * band * 1.5, P.y + ny * band * 1.5);
      const inn = sample(g, w, h, P.x - nx * band, P.y - ny * band);
      if (out < 0 || inn < 0) { n++; continue; } // off-frame counts against
      n++;
      if (Math.abs(out - bgLuma) <= tol) good++;
    }
    worst = Math.min(worst, n ? good / n : 0);
  }
  return worst;
}

/**
 * Post-warp border check on a rectified gray card: every side must have a fairly uniform
 * border band. A band with a strong cut-through feature (artwork or text sliced by a bad
 * crop) has high spread. Returns the max per-side robust spread (IQR, 0-255).
 */
export function borderBandSpread(g: Uint8Array, w: number, h: number, bandFrac = 0.025): number[] {
  const bw = Math.max(2, Math.round(w * bandFrac)), inset = Math.max(1, Math.round(w * 0.006));
  const sides: number[][] = [[], [], [], []];
  for (let x = Math.round(w * 0.12); x < w * 0.88; x++) for (let d = inset; d < inset + bw; d++) {
    sides[0].push(g[d * w + x]); sides[2].push(g[(h - 1 - d) * w + x]);
  }
  for (let y = Math.round(h * 0.12); y < h * 0.88; y++) for (let d = inset; d < inset + bw; d++) {
    sides[3].push(g[y * w + d]); sides[1].push(g[y * w + (w - 1 - d)]);
  }
  return sides.map((v) => { v.sort((a, b) => a - b); return v[Math.floor(v.length * 0.85)] - v[Math.floor(v.length * 0.15)]; });
}
export const MAX_BORDER_SPREAD = 70;
export const borderBandOk = (g: Uint8Array, w: number, h: number, max = MAX_BORDER_SPREAD) => borderBandSpread(g, w, h).every((s) => s <= max);

/**
 * Small card signature for front/back comparison: 16x16 mean-luma grid (normalised)
 * plus a 16-bin histogram. Compare with signatureDistance (0 identical, ~1 unrelated).
 */
export interface CardSignature { grid: Float32Array; hist: Float32Array }
export function cardSignature(g: Uint8Array, w: number, h: number): CardSignature {
  const N = 16, grid = new Float32Array(N * N), cnt = new Float32Array(N * N), hist = new Float32Array(16);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = g[y * w + x], k = Math.min(N - 1, ((y * N) / h) | 0) * N + Math.min(N - 1, ((x * N) / w) | 0);
    grid[k] += v; cnt[k]++; hist[v >> 4]++;
  }
  let m = 0;
  for (let i = 0; i < grid.length; i++) { grid[i] /= cnt[i] || 1; m += grid[i]; }
  m /= grid.length;
  let sd = 0;
  for (let i = 0; i < grid.length; i++) { grid[i] -= m; sd += grid[i] ** 2; }
  sd = Math.sqrt(sd / grid.length) || 1;
  for (let i = 0; i < grid.length; i++) grid[i] /= sd;
  const tot = w * h || 1;
  for (let i = 0; i < 16; i++) hist[i] /= tot;
  return { grid, hist };
}
export function signatureDistance(a: CardSignature, b: CardSignature): number {
  let dot = 0;
  for (let i = 0; i < a.grid.length; i++) dot += a.grid[i] * b.grid[i];
  const corr = dot / a.grid.length; // -1..1
  let hd = 0;
  for (let i = 0; i < 16; i++) hd += Math.abs(a.hist[i] - b.hist[i]);
  return 0.6 * (1 - Math.max(0, corr)) + 0.4 * (hd / 2);
}
/** Below this the "back" is treated as the same face as the front. */
export const SAME_FACE_DISTANCE = 0.18;
