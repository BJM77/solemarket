import type { Quad } from './geometry';

export interface Lighting {
  /**
   * Share of card pixels in the LARGEST clustered blob of clipped near-white highlights.
   * Scattered sparkle (holo / foil / refractor patterns) does not count: only a connected
   * patch is a real reflection of a light source.
   */
  glare: number;
  /** Largest clustered highlight blob inside the card's outer edge band, as a share of the band. */
  edgeGlare: number;
  /** All clipped near-white pixels / card pixels (scattered sparkle included). Informational. */
  clippedShare: number;
  /** mean luma over the card 0-255 */
  meanLuma: number;
  /** median luma over the card */
  medianLuma: number;
}

/** Smallest blob that counts as glare, as a share of card pixels (smaller = sparkle). */
export const GLARE_MIN_BLOB = 0.0015;
/** Edge band depth used for edgeGlare, as a fraction of the card's short side. */
export const GLARE_EDGE_BAND = 0.08;

function inQuad(q: Quad, x: number, y: number): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4];
    const c = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
    if (c !== 0) { const s = c > 0 ? 1 : -1; if (sign && s !== sign) return false; sign = s; }
  }
  return true;
}

/** Distance from (x,y) to the nearest edge of a convex quad (positive inside). */
function edgeDistance(q: Quad, x: number, y: number): number {
  let m = Infinity;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    m = Math.min(m, Math.abs((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x)) / L);
  }
  return m;
}

/** Glare + exposure over the card region of a (downscaled) gray frame. */
export function analyseLighting(g: Uint8Array, w: number, h: number, quad: Quad): Lighting {
  const xs = quad.map((p) => p.x), ys = quad.map((p) => p.y);
  const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(w - 1, Math.ceil(Math.max(...xs)));
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(h - 1, Math.ceil(Math.max(...ys)));
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
  if (bw <= 0 || bh <= 0) return { glare: 0, edgeGlare: 0, clippedShare: 0, meanLuma: 0, medianLuma: 0 };
  const hist = new Uint32Array(256);
  // 0 = outside card, 1 = card interior, 2 = card edge band
  const zone = new Uint8Array(bw * bh);
  const short = Math.min(Math.hypot(quad[1].x - quad[0].x, quad[1].y - quad[0].y), Math.hypot(quad[3].x - quad[0].x, quad[3].y - quad[0].y));
  const band = Math.max(1.5, short * GLARE_EDGE_BAND);
  let n = 0, sum = 0, nEdge = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!inQuad(quad, x + 0.5, y + 0.5)) continue;
    const v = g[y * w + x]; hist[v]++; sum += v; n++;
    const e = edgeDistance(quad, x + 0.5, y + 0.5) <= band;
    zone[(y - y0) * bw + (x - x0)] = e ? 2 : 1;
    if (e) nEdge++;
  }
  if (!n) return { glare: 0, edgeGlare: 0, clippedShare: 0, meanLuma: 0, medianLuma: 0 };
  let acc = 0, med = 0;
  for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n / 2) { med = v; break; } }
  // Specular highlight: clipped AND well above the card's typical brightness.
  const thr = Math.min(253, Math.max(248, med + 45));
  let clipped = 0;
  for (let v = thr; v < 256; v++) clipped += hist[v];
  // Cluster clipped pixels (8-connected). A light reflection is one solid patch; holo
  // sparkle is many tiny specks that never join into a sizeable blob.
  const lab = new Int32Array(bw * bh), stack = new Int32Array(bw * bh);
  const hot = (i: number) => zone[i] !== 0 && g[(y0 + ((i / bw) | 0)) * w + x0 + (i % bw)] >= thr;
  let best = 0, bestEdge = 0, cur = 0;
  for (let s0 = 0; s0 < zone.length; s0++) {
    if (lab[s0] || !hot(s0)) continue;
    cur++;
    let sp = 0, size = 0, edge = 0;
    stack[sp++] = s0; lab[s0] = cur;
    while (sp) {
      const i = stack[--sp]; size++; if (zone[i] === 2) edge++;
      const cx = i % bw, cy = (i / bw) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= bw || ny >= bh) continue;
        const j = ny * bw + nx;
        if (!lab[j] && hot(j)) { lab[j] = cur; stack[sp++] = j; }
      }
    }
    if (size > best) best = size;
    if (size >= n * GLARE_MIN_BLOB && edge > bestEdge) bestEdge = edge;
  }
  const glare = best >= Math.max(4, n * GLARE_MIN_BLOB) ? best / n : 0;
  return { glare, edgeGlare: nEdge ? bestEdge / nEdge : 0, clippedShare: clipped / n, meanLuma: sum / n, medianLuma: med };
}

/**
 * Hysteresis for the on-screen "Tilt away from the light" hint so it doesn't flicker:
 * turns on above `threshold`, off again below `threshold * offRatio`.
 */
export class GlareHint {
  private on = false;
  constructor(private offRatio = 0.6) {}
  reset() { this.on = false; }
  update(light: Pick<Lighting, 'glare' | 'edgeGlare'> | undefined | null, threshold: number, edgeThreshold = Infinity): boolean {
    if (!light) { this.on = false; return false; }
    const k = this.on ? this.offRatio : 1;
    this.on = light.glare > threshold * k || light.edgeGlare > edgeThreshold * k;
    return this.on;
  }
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
