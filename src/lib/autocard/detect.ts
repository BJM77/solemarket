import { convexHull, maxAreaQuad, orderPortrait, polygonArea, type Pt, type Quad } from './geometry';

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

export function detectCard(g: Uint8Array, w: number, h: number, bg: Background = 'auto', threshold = 40): Detection {
  const bgLuma = bg === 'white' ? Math.max(borderLuma(g, w, h), 180) : bg === 'black' ? Math.min(borderLuma(g, w, h), 70) : borderLuma(g, w, h);
  const fg = new Uint8Array(w * h);
  let bgCount = 0;
  for (let i = 0; i < fg.length; i++) {
    if (Math.abs(g[i] - bgLuma) > threshold) fg[i] = 1; else bgCount++;
  }
  // Largest connected component (iterative flood fill).
  const label = new Int32Array(w * h);
  let bestLabel = 0, bestSize = 0, cur = 0;
  const stack = new Int32Array(w * h);
  for (let s = 0; s < fg.length; s++) {
    if (!fg[s] || label[s]) continue;
    cur++;
    let sp = 0, size = 0;
    stack[sp++] = s; label[s] = cur;
    while (sp) {
      const i = stack[--sp]; size++;
      const x = i % w;
      if (x > 0 && fg[i - 1] && !label[i - 1]) { label[i - 1] = cur; stack[sp++] = i - 1; }
      if (x < w - 1 && fg[i + 1] && !label[i + 1]) { label[i + 1] = cur; stack[sp++] = i + 1; }
      if (i >= w && fg[i - w] && !label[i - w]) { label[i - w] = cur; stack[sp++] = i - w; }
      if (i < fg.length - w && fg[i + w] && !label[i + w]) { label[i + w] = cur; stack[sp++] = i + w; }
    }
    if (size > bestSize) { bestSize = size; bestLabel = cur; }
  }
  const empty: Detection = { quad: null, fill: 0, backgroundCoverage: bgCount / (w * h), bgLuma, width: w, height: h };
  if (bestSize < w * h * 0.03) return empty;
  // Row-wise extreme points of the blob are enough for the hull.
  const pts: Pt[] = [];
  for (let y = 0; y < h; y++) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) if (label[y * w + x] === bestLabel) { if (minX < 0) minX = x; maxX = x; }
    if (minX >= 0) { pts.push({ x: minX, y }, { x: maxX + 1, y }); }
  }
  const hull = convexHull(pts);
  const q = maxAreaQuad(hull);
  const quad = q ? orderPortrait(q) : null;
  return { ...empty, quad, fill: quad ? polygonArea(quad) / (w * h) : 0 };
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
