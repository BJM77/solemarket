import type { Quad } from './geometry';

export interface Lighting {
  /** share of card pixels that are clipped specular highlights */
  glare: number;
  /** mean luma over the card 0-255 */
  meanLuma: number;
  /** median luma over the card */
  medianLuma: number;
}

function inQuad(q: Quad, x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c !== 0) { const s = c > 0 ? 1 : -1; if (sign && s !== sign) return false; sign = s; }
  }
  return true;
}

/** Glare + exposure over the card region of a (downscaled) gray frame. */
export function analyseLighting(g: Uint8Array, w: number, h: number, quad: Quad): Lighting {
  const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const hist = new Uint32Array(256);
  let n = 0, sum = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inQuad(quad, x + 0.5, y + 0.5)) continue;
    const v = g[y * w + x]; hist[v]++; sum += v; n++;
  }
  if (!n) return { glare: 0, meanLuma: 0, medianLuma: 0 };
  let acc = 0, med = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n / 2) { med = v; break; } }
  // Specular highlight: clipped AND well above the card's typical brightness.
  const thr = Math.min(253, Math.max(248, med + 45));
  let clipped = 0;
  for (let v = thr; v < 256; v++) clipped += hist[v];
  return { glare: clipped / n, meanLuma: sum / n, medianLuma: med };
}

/**
 * Gray-world white balance + gentle contrast/exposure normalisation (in place, RGBA).
 * Gains are clamped so a genuinely coloured card is not neutralised too hard, and the
 * levels stretch is blended at `strength` so it stays natural. Front and back come out
 * with matching neutral grey and similar brightness.
 */
export function normaliseColour(px: Uint8ClampedArray, strength = 0.6): Uint8ClampedArray {
  let r = 0, gS = 0, b = 0, n = 0;
  for (let i = 0; i < px.length; i += 16) { r += px[i]; gS += px[i + 1]; b += px[i + 2]; n++; }
  if (!n) return px;
  r /= n; gS /= n; b /= n;
  const avg = (r + gS + b) / 3, clamp = (k: number) => Math.min(1.35, Math.max(0.75, k));
  const gr = clamp(avg / Math.max(r, 1)), gg = clamp(avg / Math.max(gS, 1)), gb = clamp(avg / Math.max(b, 1));
  // luma percentiles after WB
  const hist = new Uint32Array(256);
  let m = 0;
  for (let i = 0; i < px.length; i += 16) { const l = Math.min(255, (px[i] * gr * 77 + px[i + 1] * gg * 150 + px[i + 2] * gb * 29) / 256) | 0; hist[l]++; m++; }
  const pct = (p: number) => { let a = 0; for (let v = 0; v < 256; v++) { a += hist[v]; if (a >= m * p) return v; } return 255; };
  const lo = pct(0.01), hi = pct(0.99);
  const span = Math.max(hi - lo, 64);
  const lut = new Uint8ClampedArray(256 * 3);
  const gains = [gr, gg, gb];
  for (let c = 0; c < 3; c++) for (let v = 0; v < 256; v++) {
    const wb = v * gains[c];
    const stretched = ((wb - lo) * 250) / span + 2;
    lut[c * 256 + v] = wb + (stretched - wb) * strength;
  }
  for (let i = 0; i < px.length; i += 4) { px[i] = lut[px[i]]; px[i + 1] = lut[256 + px[i + 1]]; px[i + 2] = lut[512 + px[i + 2]]; }
  return px;
}
