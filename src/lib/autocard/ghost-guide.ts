import { CARD_ASPECT, polygonArea, type Pt, type Quad } from './geometry';
import type { Sleeve } from './sleeve';

/** Guide height as a share of the viewfinder height. Slabs/toploaders are bigger than the card. */
export const GUIDE_HEIGHT_FRAC: Record<Sleeve, number> = { none: 0.7, soft: 0.72, hard: 0.82 };
/** Card inside a hard sleeve / slab: share of the guide outline the card itself fills. */
export const HARD_CARD_SCALE = 0.8;
/** Detected quad vs guide IoU at which the guide turns green and hands off. */
export const GUIDE_IOU = 0.6;
export const GUIDE_PROMPT = 'Place card inside guide';

function rect(cx: number, cy: number, w: number, h: number): Quad {
  return [{ x: cx - w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy - h / 2 }, { x: cx + w / 2, y: cy + h / 2 }, { x: cx - w / 2, y: cy + h / 2 }];
}

/**
 * Centred 63:88 guide in view coordinates. `outline` is what is drawn; `target` is where the
 * detected card should land (smaller than the outline in hard-sleeve mode, since detection
 * returns the card inside the plastic).
 */
export function guideQuads(w: number, h: number, sleeve: Sleeve): { outline: Quad; target: Quad } {
  let gh = h * GUIDE_HEIGHT_FRAC[sleeve], gw = gh * CARD_ASPECT;
  if (gw > w * 0.9) { gw = w * 0.9; gh = gw / CARD_ASPECT; }
  const outline = rect(w / 2, h / 2, gw, gh);
  const k = sleeve === 'hard' ? HARD_CARD_SCALE : 1;
  return { outline, target: rect(w / 2, h / 2, gw * k, gh * k) };
}

const signedArea = (p: Pt[]) => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a.x * b.y - b.x * a.y; } return s / 2; };

/** Sutherland–Hodgman clip of `subject` by convex `clip`. */
function clipPolygon(subject: Pt[], clip: Pt[]): Pt[] {
  const ccw = signedArea(clip) > 0;
  const inside = (p: Pt, a: Pt, b: Pt) => { const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x); return ccw ? c >= 0 : c <= 0; };
  const cross = (p: Pt, q: Pt, a: Pt, b: Pt): Pt => {
    const a1 = b.y - a.y, b1 = a.x - b.x, c1 = a1 * a.x + b1 * a.y;
    const a2 = q.y - p.y, b2 = p.x - q.x, c2 = a2 * p.x + b2 * p.y;
    const det = a1 * b2 - a2 * b1;
    if (Math.abs(det) < 1e-12) return p;
    return { x: (b2 * c1 - b1 * c2) / det, y: (a1 * c2 - a2 * c1) / det };
  };
  let out = subject;
  for (let i = 0; i < clip.length && out.length; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const input = out; out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j], q = input[(j + 1) % input.length];
      const pin = inside(p, a, b), qin = inside(q, a, b);
      if (pin) { out.push(p); if (!qin) out.push(cross(p, q, a, b)); }
      else if (qin) out.push(cross(p, q, a, b));
    }
  }
  return out;
}

/** Intersection-over-union of two convex quads (0..1). */
export function quadIoU(a: Quad, b: Quad): number {
  const ia = polygonArea(a), ib = polygonArea(b);
  if (ia <= 0 || ib <= 0) return 0;
  const inter = clipPolygon(a, b);
  const ii = inter.length >= 3 ? polygonArea(inter) : 0;
  return ii / (ia + ib - ii);
}

export type GuideState = 'idle' | 'matched' | 'hidden';

/** idle: no card yet (faint guide). matched: card overlaps the guide well (green, hand off). hidden: tracking box only. */
export function guideState(quad: Quad | null, w: number, h: number, sleeve: Sleeve, threshold = GUIDE_IOU): GuideState {
  if (!quad) return 'idle';
  return quadIoU(quad, guideQuads(w, h, sleeve).target) >= threshold ? 'matched' : 'hidden';
}
