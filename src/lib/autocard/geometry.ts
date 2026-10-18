/**
 * AutoCard geometry: pure functions, no DOM. Unit tested.
 * Coordinates are in pixels of the analysed (downscaled) frame; x right, y down.
 */
export type Pt = { x: number; y: number };
export type Quad = [Pt, Pt, Pt, Pt]; // TL, TR, BR, BL after orderPortrait()

export const CARD_ASPECT = 63 / 88; // 0.716 (width / height, portrait)

export const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function polygonArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

/** Andrew's monotone chain convex hull (counter-clockwise in math coords). */
export function convexHull(points: Pt[]): Pt[] {
  const p = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const pt of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], pt) <= 0) lower.pop();
    lower.push(pt);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const pt = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pt) <= 0) upper.pop();
    upper.push(pt);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

/**
 * Largest-area quadrilateral with vertices on the hull. Rounded card corners are
 * cut slightly; the area-maximising quad still hugs the straight edges.
 * O(n^2) with two-pointer sweeps; hull is small (tens of points) after downscaling.
 */
export function maxAreaQuad(hull: Pt[]): Pt[] | null {
  const n = hull.length;
  if (n < 4) return null;
  const tri = (a: Pt, b: Pt, c: Pt) => Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
  // O(n^3): for each diagonal (i,k) pick the best vertex on each side. Distinct vertices
  // are guaranteed (the old two-pointer sweep could return a repeated corner).
  let best = -1, res: Pt[] | null = null;
  for (let i = 0; i < n; i++) for (let k = i + 2; k < n; k++) {
    if (i === 0 && k === n - 1) continue;
    let bj = -1, aj = -1, bl = -1, al = -1;
    for (let j = i + 1; j < k; j++) { const t = tri(hull[i], hull[j], hull[k]); if (t > aj) { aj = t; bj = j; } }
    for (let l = k + 1; l < n + i; l++) { const t = tri(hull[i], hull[k], hull[l % n]); if (t > al) { al = t; bl = l % n; } }
    if (bj < 0 || bl < 0) continue;
    if (aj + al > best) { best = aj + al; res = [hull[i], hull[bj], hull[k], hull[bl]]; }
  }
  return res;
}

/**
 * Deterministic portrait orientation (Ben's rule): cards are always portrait and never
 * rotated more than 90 degrees, so the TOP edge is the short edge whose midpoint is
 * higher in the frame. Returns [TL, TR, BR, BL] clockwise on screen, or null if the
 * quad is not portrait (short edges must be clearly shorter than long edges).
 */
export function orderPortrait(q: Pt[]): Quad | null {
  if (q.length !== 4) return null;
  // Sort corners clockwise on screen around the centroid.
  const c = { x: q.reduce((s, p) => s + p.x, 0) / 4, y: q.reduce((s, p) => s + p.y, 0) / 4 };
  const cw = [...q].sort((a, b) => Math.atan2(a.y - c.y, a.x - c.x) - Math.atan2(b.y - c.y, b.x - c.x));
  // edges e_i = cw[i] -> cw[i+1]
  const len = [0, 1, 2, 3].map((i) => dist(cw[i], cw[(i + 1) % 4]));
  const pairA = (len[0] + len[2]) / 2; // edges 0 and 2 are opposite
  const pairB = (len[1] + len[3]) / 2;
  const shortIdx = pairA < pairB ? [0, 2] : [1, 3];
  const shortLen = Math.min(pairA, pairB), longLen = Math.max(pairA, pairB);
  if (shortLen / longLen > 0.9) return null; // near-square: cannot be a portrait card
  const midY = (i: number) => (cw[i].y + cw[(i + 1) % 4].y) / 2;
  const top = midY(shortIdx[0]) <= midY(shortIdx[1]) ? shortIdx[0] : shortIdx[1];
  // Clockwise on screen with y down: walking top edge goes left -> right.
  const tl = cw[top], tr = cw[(top + 1) % 4], br = cw[(top + 2) % 4], bl = cw[(top + 3) % 4];
  // Portrait check: the top (short) edge must be closer to horizontal than vertical and
  // lie in the upper half of the quad. This rejects landscape quads deterministically.
  if (Math.abs(tr.y - tl.y) >= Math.abs(tr.x - tl.x)) return null;
  if ((tl.y + tr.y) / 2 > (bl.y + br.y) / 2) return null;
  return [tl, tr, br, bl];
}

/** Width/height of a portrait quad from opposite-edge averages. */
export function quadAspect(q: Quad): number {
  const w = (dist(q[0], q[1]) + dist(q[3], q[2])) / 2;
  const h = (dist(q[0], q[3]) + dist(q[1], q[2])) / 2;
  return w / h;
}

/** Max corner displacement between two quads (pixels). */
export function quadDelta(a: Quad, b: Quad): number {
  return Math.max(...a.map((p, i) => dist(p, b[i])));
}

/**
 * Homography H mapping src quad -> dst quad (3x3, row-major, h33 = 1).
 * Solves the standard 8x8 DLT system with Gaussian elimination.
 */
export function homography(src: Pt[], dst: Pt[]): number[] {
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const { x, y } = src[i], { x: u, y: v } = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  const h = solve(A, b);
  return [...h, 1];
}

function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) throw new Error('degenerate quad');
    [M[col], M[piv]] = [M[piv], M[col]];
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

export function applyH(H: number[], p: Pt): Pt {
  const w = H[6] * p.x + H[7] * p.y + H[8];
  return { x: (H[0] * p.x + H[1] * p.y + H[2]) / w, y: (H[3] * p.x + H[4] * p.y + H[5]) / w };
}

/**
 * Keystone measure: the larger angle (degrees) between opposite edges. 0 when the phone
 * is perfectly parallel to the card; grows as the phone tilts.
 */
export function perspectiveDeg(q: Quad): number {
  const ang = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: d.x - c.x, y: d.y - c.y };
    const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y));
    return (Math.acos(Math.min(1, Math.max(-1, cos))) * 180) / Math.PI;
  };
  const m = Math.max(ang(q[0], q[1], q[3], q[2]), ang(q[0], q[3], q[1], q[2]));
  return Number.isFinite(m) ? m : 90; // degenerate quad counts as badly tilted
}
