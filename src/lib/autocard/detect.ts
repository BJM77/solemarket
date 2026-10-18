import { isClipped, surroundScore } from './validate';
import { CARD_ASPECT, convexHull, maxAreaQuad, orderPortrait, polygonArea, quadAspect, type Pt, type Quad } from './geometry';
import type { Sleeve } from './sleeve';

/**
 * Lightweight card detector for a plain white or black background (no OpenCV).
 * 1. Estimate background luminance from the frame border.
 * 2. Foreground = pixels whose luminance differs from background by > threshold
 *    (works for white or black backgrounds; 'auto' picks whichever the border is).
 * 3. Largest 4-connected foreground blob -> boundary points -> convex hull -> max-area quad.
 */
export type Background = 'auto' | 'white' | 'black';

export interface Detection {
  quad: Quad | null;
  /** fraction of frame covered by the quad */
  fill: number;
  /** fraction of frame classified as background */
  backgroundCoverage: number;
  /** background luminance estimate 0-255 */
  bgLuma: number;
  width: number;
  height: number;
  /** a corner touches the frame margin (card cut off) */
  clipped?: boolean;
  /** worst-edge share of outside-band samples that match the background (1 = clean) */
  surround?: number;
  /** hard-sleeve mode only: which nesting level the quad came from */
  nested?: 'outer' | 'card' | 'inconsistent';
  /** hard-sleeve mode only: the outer (plastic or card) outline */
  outer?: Quad;
}

export function toGray(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const g = new Uint8Array(w * h);
  for (let i = 0, j = 0; i < g.length; i++, j += 4) g[i] = (rgba[j] * 77 + rgba[j + 1] * 150 + rgba[j + 2] * 29) >> 8;
  return g;
}

function borderLuma(g: Uint8Array, w: number, h: number): number {
  const vals: number[] = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 40));
  for (let x = 0; x < w; x += step) { vals.push(g[x], g[(h - 1) * w + x]); }
  for (let y = 0; y < h; y += step) { vals.push(g[y * w], g[y * w + w - 1]); }
  vals.sort((a, b) => a - b);
  return vals[vals.length >> 1];
}

export interface DetectOptions {
  /** 'hard' = toploader / slab: find the card's own boundary inside the plastic outline. */
  sleeve?: Sleeve;
}

/** Largest 4-connected blob of `mask` (optionally restricted). Returns label image + id. */
function largestBlob(mask: Uint8Array, w: number, h: number): { label: Int32Array; id: number; size: number } {
  const label = new Int32Array(w * h);
  let bestLabel = 0, bestSize = 0, cur = 0;
  const stack = new Int32Array(w * h);
  for (let s = 0; s < mask.length; s++) {
    if (!mask[s] || label[s]) continue;
    cur++;
    let sp = 0, size = 0;
    stack[sp++] = s; label[s] = cur;
    while (sp) {
      const i = stack[--sp]; size++;
      const x = i % w;
      if (x > 0 && mask[i - 1] && !label[i - 1]) { label[i - 1] = cur; stack[sp++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !label[i + 1]) { label[i + 1] = cur; stack[sp++] = i + 1; }
      if (i >= w && mask[i - w] && !label[i - w]) { label[i - w] = cur; stack[sp++] = i - w; }
      if (i < mask.length - w && mask[i + w] && !label[i + w]) { label[i + w] = cur; stack[sp++] = i + w; }
    }
    if (size > bestSize) { bestSize = size; bestLabel = cur; }
  }
  return { label, id: bestLabel, size: bestSize };
}

/** Row-wise extreme points of a blob -> convex hull -> max-area portrait quad. */
function blobQuad(label: Int32Array, id: number, w: number, h: number): Quad | null {
  const pts: Pt[] = [];
  for (let y = 0; y < h; y++) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) if (label[y * w + x] === id) { if (minX < 0) minX = x; maxX = x; }
    if (minX >= 0) { pts.push({ x: minX, y }, { x: maxX + 1, y }); }
  }
  const q = maxAreaQuad(convexHull(pts));
  return q ? orderPortrait(q) : null;
}

/** Inward unit normals + offsets for the 4 edge lines of a convex quad (positive = inside). */
function edgeLines(q: Quad) {
  const c = { x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 };
  return [0, 1, 2, 3].map((i) => {
    const A = q[i], B = q[(i + 1) % 4], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    let nx = -(B.y - A.y) / L, ny = (B.x - A.x) / L;
    if ((c.x - A.x) * nx + (c.y - A.y) * ny < 0) { nx = -nx; ny = -ny; }
    return { nx, ny, d: -(A.x * nx + A.y * ny) }; // signed distance = nx*x + ny*y + d
  });
}

function medianOf(vals: number[]): number {
  if (!vals.length) return 0;
  vals.sort((a, b) => a - b);
  return vals[vals.length >> 1];
}

/** Separable box min/max filter on a 0/1 mask (erode = min, dilate = max), radius r. */
function boxMorph(m: Uint8Array, w: number, h: number, r: number, erode: boolean): Uint8Array {
  const tmp = new Uint8Array(w * h), out = new Uint8Array(w * h);
  const win = 2 * r + 1;
  const pass = (src: Uint8Array, dst: Uint8Array, len: number, lines: number, idx: (line: number, k: number) => number) => {
    for (let l = 0; l < lines; l++) {
      let cnt = 0; // ones in window (outside the image counts as 0)
      for (let k = 0; k < Math.min(r, len); k++) cnt += src[idx(l, k)];
      for (let k = 0; k < len; k++) {
        const add = k + r, rem = k - r - 1;
        if (add < len) cnt += src[idx(l, add)];
        if (rem >= 0) cnt -= src[idx(l, rem)];
        const n = Math.min(len - 1, k + r) - Math.max(0, k - r) + 1;
        dst[idx(l, k)] = erode ? (cnt === n && n === win ? 1 : 0) : (cnt > 0 ? 1 : 0);
      }
    }
  };
  pass(m, tmp, w, h, (y, x) => y * w + x);
  pass(tmp, out, h, w, (x, y) => y * w + x);
  return out;
}

/** Aspect window for "this outer outline IS the card" (plastic invisible on the background). */
export const OUTER_IS_CARD_TOL = 0.02; // coarse hull quads read ~0.01 wide (cut rounded corners)
/** Plastic margin luma must stay this close to the background (clear plastic over the mat).
 *  An opaque printed card border is usually much further from the background. */
export const PLASTIC_MAX_BG_DIFF = 90;

export type Nested = 'outer' | 'card' | 'inconsistent';

/**
 * Hard sleeve / slab: given the outer outline (plastic or card), look INWARD for the card's
 * own boundary. Every one of the four card edges must come from the same nested contour
 * level: the inner blob is segmented against the plastic's own luminance, all four sides
 * must have plastic just outside them (surround check) and a positive gap to the plastic
 * outline. A result mixing a plastic edge on one side with a card edge on another fails.
 */
function findNestedCard(g: Uint8Array, w: number, h: number, outer: Quad, bgLuma: number, threshold: number):
  { quad: Quad | null; nested: Nested; plasticLuma?: number } {
  const lines = edgeLines(outer);
  const ow = (Math.hypot(outer[1].x - outer[0].x, outer[1].y - outer[0].y) + Math.hypot(outer[2].x - outer[3].x, outer[2].y - outer[3].y)) / 2;
  const sd = (x: number, y: number) => Math.min(...lines.map((l) => l.nx * x + l.ny * y + l.d));
  // Plastic luminance: median of a thin band just inside the outer outline.
  const b0 = Math.max(1.5, ow * 0.015), b1 = Math.max(3, ow * 0.035);
  const xs = outer.map((p) => p.x), ys = outer.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const band: number[] = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = sd(x + 0.5, y + 0.5);
    if (d >= b0 && d <= b1) band.push(g[y * w + x]);
  }
  const plasticLuma = medianOf(band);
  if (Math.abs(plasticLuma - bgLuma) > PLASTIC_MAX_BG_DIFF) return { quad: null, nested: 'inconsistent', plasticLuma };
  // Inner mask: inside the outline (clear of the plastic rim), and unlike the plastic.
  const mask = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w + x;
    if (sd(x + 0.5, y + 0.5) >= b0 && Math.abs(g[i] - plasticLuma) > threshold) mask[i] = 1;
  }
  // Morphological opening strips thin glossy highlight streaks that touch the card, so
  // a streak can never become the "edge" on one side.
  const r = Math.max(2, Math.round(ow * 0.025));
  const opened = boxMorph(boxMorph(mask, w, h, r, true), w, h, r, false);
  const blob = largestBlob(opened, w, h);
  if (blob.size < w * h * 0.02) return { quad: null, nested: 'inconsistent', plasticLuma };
  const inner = blobQuad(blob.label, blob.id, w, h);
  if (!inner) return { quad: null, nested: 'inconsistent', plasticLuma };
  const ratio = polygonArea(inner) / Math.max(1, polygonArea(outer));
  if (Math.abs(quadAspect(inner) - CARD_ASPECT) > 0.025 || ratio < 0.25 || ratio > 0.97) return { quad: null, nested: 'inconsistent', plasticLuma };
  // Same nesting level on all four sides: positive gap to the outline...
  const minGap = Math.max(1.5, b0 * 1.5);
  for (let i = 0; i < 4; i++) {
    const A = inner[i], B = inner[(i + 1) % 4];
    if (sd((A.x + B.x) / 2, (A.y + B.y) / 2) < minGap || sd(A.x, A.y) < 0) return { quad: null, nested: 'inconsistent', plasticLuma };
  }
  // ...and plastic (not background, not another feature) just outside every edge.
  if (surroundScore(g, w, h, inner, plasticLuma, { tol: threshold }) < 0.7) return { quad: null, nested: 'inconsistent', plasticLuma };
  return { quad: inner, nested: 'card', plasticLuma };
}

export function detectCard(g: Uint8Array, w: number, h: number, bg: Background = 'auto', threshold = 40, opts: DetectOptions = {}): Detection {
  const bgLuma = bg === 'white' ? Math.max(borderLuma(g, w, h), 180) : bg === 'black' ? Math.min(borderLuma(g, w, h), 70) : borderLuma(g, w, h);
  const fg = new Uint8Array(w * h);
  let bgCount = 0;
  for (let i = 0; i < fg.length; i++) {
    if (Math.abs(g[i] - bgLuma) > threshold) fg[i] = 1; else bgCount++;
  }
  const { label, id: bestLabel, size: bestSize } = largestBlob(fg, w, h);
  const empty: Detection = { quad: null, fill: 0, backgroundCoverage: bgCount / (w * h), bgLuma, width: w, height: h };
  if (bestSize < w * h * 0.03) return empty;
  const outerQuad = blobQuad(label, bestLabel, w, h);
  // Blob touching the frame edge = card cut off; judge on the blob, not the quad.
  let touches = false;
  const m = Math.max(1, Math.round(Math.min(w, h) * 0.01));
  for (let x = 0; x < w && !touches; x++) for (let k = 0; k < m; k++) if (label[k * w + x] === bestLabel || label[(h - 1 - k) * w + x] === bestLabel) { touches = true; break; }
  for (let y = 0; y < h && !touches; y++) for (let k = 0; k < m; k++) if (label[y * w + k] === bestLabel || label[y * w + w - 1 - k] === bestLabel) { touches = true; break; }
  let quad = outerQuad, surroundRef = bgLuma, nested: Nested | undefined;
  if (opts.sleeve === 'hard' && outerQuad) {
    // Inner card inside visible plastic first; otherwise the outline itself must be card-shaped
    // (plastic invisible on this background). Anything else is rejected, never mixed.
    const r = findNestedCard(g, w, h, outerQuad, bgLuma, threshold);
    if (r.quad) { nested = 'card'; quad = r.quad; surroundRef = r.plasticLuma ?? bgLuma; }
    else if (Math.abs(quadAspect(outerQuad) - CARD_ASPECT) <= OUTER_IS_CARD_TOL) nested = 'outer';
    else { nested = 'inconsistent'; quad = null; }
  }
  return {
    ...empty, quad, fill: quad ? polygonArea(quad) / (w * h) : 0,
    clipped: touches || (quad ? isClipped(quad, w, h) : false),
    surround: quad ? surroundScore(g, w, h, quad, surroundRef, { tol: threshold }) : 0,
    ...(opts.sleeve === 'hard' ? { nested, outer: outerQuad ?? undefined } : {}),
  };
}

/** Variance of the 4-neighbour Laplacian inside a rectangle (focus measure). */
export function laplacianVariance(g: Uint8Array, w: number, h: number, rect?: { x0: number; y0: number; x1: number; y1: number }): number {
  const x0 = Math.max(1, rect?.x0 ?? 1), y0 = Math.max(1, rect?.y0 ?? 1);
  const x1 = Math.min(w - 1, rect?.x1 ?? w - 1), y1 = Math.min(h - 1, rect?.y1 ?? h - 1);
  let sum = 0, sum2 = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * w + x;
    const v = g[i - 1] + g[i + 1] + g[i - w] + g[i + w] - 4 * g[i];
    sum += v; sum2 += v * v; n++;
  }
  if (!n) return 0;
  const m = sum / n;
  return sum2 / n - m * m;
}
