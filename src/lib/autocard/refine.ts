import { applyH, homography, type Pt, type Quad } from './geometry';

/**
 * Sub-pixel corner refinement. Card corners are rounded, so the hull/quad corner
 * points sit inside the true corners. Instead we fit a straight line to each edge
 * (sampling only the middle of the edge, away from the rounded corners) and use the
 * line intersections as corners. Works on any resolution gray image; the coarse quad
 * may come from a downscaled detection frame (scaled up).
 */
export interface Line { p: Pt; d: Pt } // point + unit direction
export interface RefineResult { quad: Quad; ok: boolean; inlierRatio: number; rms: number }

function sample(g: Uint8Array, w: number, h: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > w - 1.001 || y > h - 1.001) return -1;
  const x0 = x | 0, y0 = y | 0, ax = x - x0, ay = y - y0, i = y0 * w + x0;
  const t = g[i] + (g[i + 1] - g[i]) * ax, b = g[i + w] + (g[i + w + 1] - g[i + w]) * ax;
  return t + (b - t) * ay;
}

/** Deterministic PRNG so RANSAC is reproducible. */
function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Total-least-squares line through points. */
export function fitLineTLS(pts: Pt[]): Line {
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) { const dx = p.x - mx, dy = p.y - my; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  return { p: { x: mx, y: my }, d: { x: Math.cos(th), y: Math.sin(th) } };
}

const lineDist = (l: Line, q: Pt) => Math.abs((q.x - l.p.x) * l.d.y - (q.y - l.p.y) * l.d.x);

/** RANSAC + TLS refit on inliers. */
export function fitLineRobust(pts: Pt[], thr: number, iters = 80, seed = 7): { line: Line; inliers: number; rms: number } | null {
  if (pts.length < 4) return null;
  const rnd = lcg(seed);
  let best: Pt[] = [];
  for (let k = 0; k < iters; k++) {
    const a = pts[(rnd() * pts.length) | 0], b = pts[(rnd() * pts.length) | 0];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    const l: Line = { p: a, d: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } };
    const inl = pts.filter((q) => lineDist(l, q) <= thr);
    if (inl.length > best.length) best = inl;
  }
  if (best.length < 4) return null;
  let line = fitLineTLS(best);
  // one re-selection pass with the refined line
  const inl2 = pts.filter((q) => lineDist(line, q) <= thr);
  if (inl2.length >= 4) { line = fitLineTLS(inl2); best = inl2; }
  const rms = Math.sqrt(best.reduce((s, q) => s + lineDist(line, q) ** 2, 0) / best.length);
  return { line, inliers: best.length, rms };
}

export function intersect(a: Line, b: Line): Pt | null {
  const den = a.d.x * b.d.y - a.d.y * b.d.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((b.p.x - a.p.x) * b.d.y - (b.p.y - a.p.y) * b.d.x) / den;
  return { x: a.p.x + a.d.x * t, y: a.p.y + a.d.y * t };
}

/**
 * Edge points along one side A->B: search along the outward normal for the strongest
 * card/background transition (polarity fixed per edge), sub-pixel via parabola fit.
 */
function edgePoints(g: Uint8Array, w: number, h: number, A: Pt, B: Pt, out: Pt, radius: number, n: number, trim: number): Pt[] {
  const ex = B.x - A.x, ey = B.y - A.y, L = Math.hypot(ex, ey);
  let nx = -ey / L, ny = ex / L;
  const mid = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
  if ((mid.x - out.x) * nx + (mid.y - out.y) * ny < 0) { nx = -nx; ny = -ny; } // point away from centre
  const R = Math.ceil(radius), prof = new Float32Array(2 * R + 1);
  const profiles: { P: Pt; prof: Float32Array }[] = [];
  let pol = 0;
  for (let k = 0; k < n; k++) {
    const t = trim + ((1 - 2 * trim) * (k + 0.5)) / n;
    const P = { x: A.x + ex * t, y: A.y + ey * t };
    const pr = prof.slice();
    let valid = true;
    for (let s = -R; s <= R; s++) { const v = sample(g, w, h, P.x + nx * s, P.y + ny * s); if (v < 0) { valid = false; break; } pr[s + R] = v; }
    if (!valid) continue;
    pol += pr[2 * R] - pr[0]; // outside minus inside
    profiles.push({ P, prof: pr });
  }
  const sign = pol >= 0 ? 1 : -1;
  const pts: Pt[] = [];
  for (const { P, prof: pr } of profiles) {
    let bi = -1, bv = 0;
    for (let i = 1; i < pr.length - 1; i++) { const d = sign * (pr[i + 1] - pr[i - 1]); if (d > bv) { bv = d; bi = i; } }
    if (bi < 2 || bi > pr.length - 3 || bv < 8) continue;
    const dm = sign * (pr[bi] - pr[bi - 2]), dp = sign * (pr[bi + 2] - pr[bi]);
    const den = dm - 2 * bv + dp;
    const off = Math.abs(den) > 1e-6 ? Math.max(-0.5, Math.min(0.5, (0.5 * (dm - dp)) / den)) : 0;
    const s = bi - R + off;
    pts.push({ x: P.x + nx * s, y: P.y + ny * s });
  }
  return pts;
}

/**
 * Refine a coarse [TL,TR,BR,BL] quad to line-intersection corners.
 * `radius` is the normal search distance in pixels (default ~4% of the edge).
 */
export function refineCorners(g: Uint8Array, w: number, h: number, coarse: Quad, opts: { radius?: number; samples?: number; trim?: number } = {}): RefineResult {
  const c = { x: coarse.reduce((s, p) => s + p.x, 0) / 4, y: coarse.reduce((s, p) => s + p.y, 0) / 4 };
  const lines: Line[] = [];
  let inl = 0, tot = 0, rmsSum = 0;
  for (let i = 0; i < 4; i++) {
    const A = coarse[i], B = coarse[(i + 1) % 4];
    const L = Math.hypot(B.x - A.x, B.y - A.y);
    const radius = opts.radius ?? Math.max(5, 0.04 * L);
    const n = opts.samples ?? Math.max(16, Math.min(120, Math.round(L / 4)));
    const pts = edgePoints(g, w, h, A, B, c, radius, n, opts.trim ?? 0.12);
    const fit = fitLineRobust(pts, Math.max(0.6, 0.003 * L), 80, 7 + i);
    if (!fit || fit.inliers < n * 0.3) return { quad: coarse, ok: false, inlierRatio: 0, rms: Infinity };
    lines.push(fit.line); inl += fit.inliers; tot += n; rmsSum += fit.rms;
  }
  const q: Pt[] = [];
  for (let i = 0; i < 4; i++) { const p = intersect(lines[(i + 3) % 4], lines[i]); if (!p) return { quad: coarse, ok: false, inlierRatio: 0, rms: Infinity }; q.push(p); }
  // sanity: refined corners must stay near the coarse ones
  const diag = Math.hypot(coarse[2].x - coarse[0].x, coarse[2].y - coarse[0].y);
  if (q.some((p, i) => Math.hypot(p.x - coarse[i].x, p.y - coarse[i].y) > 0.1 * diag)) return { quad: coarse, ok: false, inlierRatio: inl / tot, rms: rmsSum / 4 };
  return { quad: q as Quad, ok: true, inlierRatio: inl / tot, rms: rmsSum / 4 };
}

/** Warp a gray image region with an explicit output->source homography. */
export function warpGrayH(g: Uint8Array, w: number, h: number, H: number[], ow: number, oh: number): Uint8Array {
  const out = new Uint8Array(ow * oh);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    const p = applyH(H, { x: x + 0.5, y: y + 0.5 });
    const v = sample(g, w, h, p.x - 0.5, p.y - 0.5);
    out[y * ow + x] = v < 0 ? 0 : v;
  }
  return out;
}

/**
 * Post-warp verification: rectify the quad into a padded low-res card image, re-fit the
 * four edges there and measure how far the card is from a perfect 63:88 rectangle.
 * If off by more than `tol` (fraction of card width), map the measured corners back into
 * the source and try again. Returns the corrected quad and the final error.
 */
export function verifyAndCorrect(g: Uint8Array, w: number, h: number, quad: Quad, opts: { tol?: number; iterations?: number; cardW?: number } = {}): { quad: Quad; error: number; aspect: number; corrected: boolean } {
  const tol = opts.tol ?? 0.01, cw = opts.cardW ?? 252, ch = Math.round((cw * 88) / 63), pad = Math.round(cw * 0.06);
  let q = quad, corrected = false, error = Infinity, aspect = 0;
  for (let it = 0; it <= (opts.iterations ?? 2); it++) {
    const rect: Pt[] = [{ x: pad, y: pad }, { x: pad + cw, y: pad }, { x: pad + cw, y: pad + ch }, { x: pad, y: pad + ch }];
    const H = homography(rect, q); // padded output -> source
    const ow = cw + 2 * pad, oh = ch + 2 * pad;
    const img = warpGrayH(g, w, h, H, ow, oh);
    const r = refineCorners(img, ow, oh, rect as Quad, { radius: pad * 0.8 });
    if (!r.ok) return { quad: q, error: Number.NaN, aspect: Number.NaN, corrected };
    error = Math.max(...r.quad.map((p, i) => Math.hypot(p.x - rect[i].x, p.y - rect[i].y))) / cw;
    const mw = (Math.hypot(r.quad[1].x - r.quad[0].x, r.quad[1].y - r.quad[0].y) + Math.hypot(r.quad[2].x - r.quad[3].x, r.quad[2].y - r.quad[3].y)) / 2;
    const mh = (Math.hypot(r.quad[3].x - r.quad[0].x, r.quad[3].y - r.quad[0].y) + Math.hypot(r.quad[2].x - r.quad[1].x, r.quad[2].y - r.quad[1].y)) / 2;
    aspect = mw / mh;
    if (error <= tol || it === (opts.iterations ?? 2)) break;
    q = r.quad.map((p) => applyH(H, p)) as Quad;
    corrected = true;
  }
  return { quad: q, error, aspect, corrected };
}
