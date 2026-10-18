import { detectCard, type Background } from './detect';
import { polygonArea, type Quad } from './geometry';
import { refineCorners, verifyAndCorrect } from './refine';
import { scaleQuad } from './warp';

/** Box-downscale a gray image by an integer-free factor (area average, nearest bins). */
export function downscaleGray(g: Uint8Array, w: number, h: number, ow: number): { g: Uint8Array; w: number; h: number } {
  const oh = Math.max(1, Math.round((h * ow) / w));
  const out = new Uint8Array(ow * oh);
  const sx = w / ow, sy = h / oh;
  for (let y = 0; y < oh; y++) {
    const ya = Math.floor(y * sy), yb = Math.max(ya + 1, Math.floor((y + 1) * sy));
    for (let x = 0; x < ow; x++) {
      const xa = Math.floor(x * sx), xb = Math.max(xa + 1, Math.floor((x + 1) * sx));
      let s = 0, n = 0;
      for (let yy = ya; yy < yb; yy++) for (let xx = xa; xx < xb; xx++) { s += g[yy * w + xx]; n++; }
      out[y * ow + x] = s / n;
    }
  }
  return { g: out, w: ow, h: oh };
}

export interface Located { quad: Quad; refined: boolean; verifyError: number; aspect: number }

/**
 * Full-resolution card location: coarse detect on a ~320px copy, then fit edge lines
 * on the full-res image and verify/correct the rectified result.
 */
export function locateCard(g: Uint8Array, w: number, h: number, bg: Background = 'auto', hint?: Quad | null, analysisW = 320): Located | null {
  let coarse = hint ?? null;
  if (!coarse) {
    const small = downscaleGray(g, w, h, Math.min(analysisW, w));
    const d = detectCard(small.g, small.w, small.h, bg);
    if (!d.quad) return null;
    coarse = scaleQuad(d.quad, w / small.w, h / small.h);
  }
  // Two passes: the first pulls the cut-corner quad onto the edges, the second tightens.
  let r = refineCorners(g, w, h, coarse);
  if (r.ok) { const r2 = refineCorners(g, w, h, r.quad, { radius: Math.max(4, Math.min(w, h) * 0.006) }); if (r2.ok) r = r2; }
  // Never let refinement shrink onto an inner rectangle (artwork / text box) that sits
  // inside the outer card blob: a refined quad much smaller than the blob is rejected.
  const coarseArea = polygonArea(coarse);
  const shrunk = (q: Quad) => polygonArea(q) < coarseArea * 0.9;
  const refinedOk = r.ok && !shrunk(r.quad);
  const base = refinedOk ? r.quad : coarse;
  const v = verifyAndCorrect(g, w, h, base);
  if (shrunk(v.quad)) return { quad: base, refined: refinedOk, verifyError: Number.NaN, aspect: Number.NaN };
  return { quad: v.quad, refined: refinedOk, verifyError: v.error, aspect: v.aspect };
}
