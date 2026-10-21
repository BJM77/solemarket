import { detectCard, laplacianVariance, toGray, type Background, type Detection } from './detect';
import { polygonArea } from './geometry';
import { refineCorners } from './refine';
import { analyseLighting, type Lighting } from './lighting';
import { REFINE_RADIUS_FRAC, type Sleeve } from './sleeve';

export interface FrameAnalysis { d: Detection; light?: Lighting; sharp: number }

/**
 * Per-frame preview analysis (gray, detect, preview-scale corner refinement, lighting and
 * sharpness). Pure, so it runs identically on the main thread or inside the detection worker.
 */
export function analyseFrame(rgba: Uint8ClampedArray, w: number, h: number, bg: Background, sleeve: Sleeve): FrameAnalysis {
  const g = toGray(rgba, w, h);
  const d = detectCard(g, w, h, bg, 40, { sleeve });
  if (d.quad) {
    // Line-fit corners even at preview scale so the tilt gate and outline are accurate.
    const r = refineCorners(g, w, h, d.quad, { samples: 24, radiusFrac: REFINE_RADIUS_FRAC[sleeve] });
    // Ignore refinements that collapse onto an inner rectangle (or, in hard-sleeve mode,
    // grow outward onto the plastic).
    const ratio = r.ok ? polygonArea(r.quad) / polygonArea(d.quad) : 0;
    if (r.ok && ratio >= 0.9 && (sleeve !== 'hard' || ratio <= 1.1)) d.quad = r.quad;
  }
  const light = d.quad ? analyseLighting(g, w, h, d.quad) : undefined;
  let sharp = 0;
  if (d.quad) {
    const xs = d.quad.map((p) => p.x), ys = d.quad.map((p) => p.y);
    sharp = laplacianVariance(g, w, h, { x0: Math.min(...xs) | 0, y0: Math.min(...ys) | 0, x1: Math.max(...xs) | 0, y1: Math.max(...ys) | 0 });
  }
  return { d, light, sharp };
}
