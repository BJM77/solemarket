import { laplacianVariance } from './detect';
import type { Quad } from './geometry';

/** A corner below this share of the centre's sharpness is flagged... */
export const CORNER_BLUR_RATIO = 0.15;
/** ...and only if it is also well below the other corners (so plain-border cards, whose
 *  corners are naturally flatter than busy centre artwork, are not flagged). */
export const CORNER_PEER_RATIO = 0.35;
/** Patch side as a share of the card's shorter side. */
export const CORNER_PATCH_FRAC = 0.18;
export const CORNER_BLUR_MESSAGE = 'Corner looks blurry, rescan?';

export interface CornerSharpness { centre: number; corners: [number, number, number, number]; worst: number; ratio: number; blurry: boolean }

/**
 * Local sharpness (Laplacian variance) of patches centred on the 4 card corners vs one at the
 * card centre, on a gray frame. Corner patches straddle the card edge, so a sharp corner has
 * strong edge contrast and normally scores at or above the centre; a micro-motion-blurred or
 * out-of-focus corner drops well below it.
 */
export function cornerSharpness(g: Uint8Array, w: number, h: number, quad: Quad, ratio = CORNER_BLUR_RATIO): CornerSharpness {
  const side = Math.min(Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y), Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y));
  const half = Math.max(3, (side * CORNER_PATCH_FRAC) / 2);
  const patch = (cx: number, cy: number) => laplacianVariance(g, w, h, {
    x0: Math.max(1, Math.round(cx - half)), y0: Math.max(1, Math.round(cy - half)),
    x1: Math.min(w - 2, Math.round(cx + half)), y1: Math.min(h - 2, Math.round(cy + half)),
  });
  const cx = quad.reduce((s, p) => s + p.x, 0) / 4, cy = quad.reduce((s, p) => s + p.y, 0) / 4;
  const centre = patch(cx, cy);
  const corners = quad.map((p) => patch(p.x, p.y)) as [number, number, number, number];
  const worst = Math.min(...corners);
  const r = centre > 0 ? worst / centre : 1;
  const sorted = [...corners].sort((a, b) => a - b), peer = (sorted[1] + sorted[2]) / 2;
  return { centre, corners, worst, ratio: r, blurry: centre > 0 && r < ratio && worst < peer * CORNER_PEER_RATIO };
}
