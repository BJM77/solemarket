import { homography, applyH, type Quad } from './geometry';

export const OUTPUT_W = 1500;
export const OUTPUT_H = 2100;

/**
 * Perspective-warp `quad` (in source pixel coords) of `src` RGBA into a fixed
 * portrait output (default 1500x2100, 5:7 ~ 63:88) with bilinear sampling.
 * Inverse mapping: for each output pixel find the source location.
 */
export function warpQuad(
  src: Uint8ClampedArray, sw: number, sh: number, quad: Quad,
  ow = OUTPUT_W, oh = OUTPUT_H, out?: Uint8ClampedArray
): Uint8ClampedArray {
  const dst = out ?? new Uint8ClampedArray(ow * oh * 4);
  // H maps output rect -> source quad
  const H = homography([{ x: 0, y: 0 }, { x: ow, y: 0 }, { x: ow, y: oh }, { x: 0, y: oh }], quad);
  let o = 0;
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++, o += 4) {
      const p = applyH(H, { x: x + 0.5, y: y + 0.5 });
      const fx = Math.min(Math.max(p.x - 0.5, 0), sw - 1.001), fy = Math.min(Math.max(p.y - 0.5, 0), sh - 1.001);
      const x0 = fx | 0, y0 = fy | 0, ax = fx - x0, ay = fy - y0;
      const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
      for (let c = 0; c < 3; c++) {
        const top = src[i00 + c] + (src[i10 + c] - src[i00 + c]) * ax;
        const bot = src[i01 + c] + (src[i11 + c] - src[i01 + c]) * ax;
        dst[o + c] = top + (bot - top) * ay;
      }
      dst[o + 3] = 255;
    }
  }
  return dst;
}

/** Scale a quad from analysis resolution to full-resolution frame coordinates. */
export function scaleQuad(q: Quad, sx: number, sy: number): Quad {
  return q.map((p) => ({ x: p.x * sx, y: p.y * sy })) as Quad;
}
