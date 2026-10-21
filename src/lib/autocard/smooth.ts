import { dist, type Quad } from './geometry';

/**
 * Adaptive exponential moving average over the four detected corners (TL, TR, BR, BL).
 *
 *   P̂ₜ = α·Pₜ + (1 − α)·P̂ₜ₋₁
 *
 * α follows the corner speed: ~0.8 while the card / phone is moving fast (the box keeps up),
 * ~0.18 when it is nearly still (1–3 px detector jitter is averaged away, so the box stops
 * twitching and the capture countdown doesn't restart). Speed is the largest corner move
 * since the last smoothed position, as a fraction of the frame diagonal.
 *
 * Used for the on-screen outline, the guidance arrows and the gate's stability checks only.
 * The capture itself always re-detects fresh full-resolution corners.
 */
export interface SmoothConfig {
  alphaSlow: number;
  alphaFast: number;
  /** speed (fraction of frame diagonal per frame) at/below which alphaSlow applies */
  slow: number;
  /** speed at/above which alphaFast applies */
  fast: number;
  /** jump larger than this (fraction of diagonal) snaps straight to the new quad */
  snap: number;
  /** frames without a detection before the state is dropped */
  holdFrames: number;
}

export const DEFAULT_SMOOTH: SmoothConfig = { alphaSlow: 0.18, alphaFast: 0.8, slow: 0.006, fast: 0.03, snap: 0.15, holdFrames: 2 };

export function adaptiveAlpha(speed: number, cfg: SmoothConfig = DEFAULT_SMOOTH): number {
  if (speed <= cfg.slow) return cfg.alphaSlow;
  if (speed >= cfg.fast) return cfg.alphaFast;
  const t = (speed - cfg.slow) / (cfg.fast - cfg.slow);
  return cfg.alphaSlow + t * (cfg.alphaFast - cfg.alphaSlow);
}

export class QuadSmoother {
  private q: Quad | null = null;
  private misses = 0;
  /** α used on the last update (for tests / debugging). */
  lastAlpha = 1;
  constructor(private cfg: SmoothConfig = DEFAULT_SMOOTH) {}

  reset() { this.q = null; this.misses = 0; this.lastAlpha = 1; }

  update(raw: Quad | null, w: number, h: number): Quad | null {
    if (!raw) {
      if (++this.misses > this.cfg.holdFrames) this.reset();
      return null;
    }
    this.misses = 0;
    const p = this.q;
    const diag = Math.hypot(w, h) || 1;
    if (!p) { this.q = raw.map((c) => ({ ...c })) as Quad; this.lastAlpha = 1; return this.q; }
    const speed = Math.max(...raw.map((c, i) => dist(c, p[i]))) / diag;
    if (speed >= this.cfg.snap) { this.q = raw.map((c) => ({ ...c })) as Quad; this.lastAlpha = 1; return this.q; }
    const a = adaptiveAlpha(speed, this.cfg);
    this.lastAlpha = a;
    this.q = raw.map((c, i) => ({ x: p[i].x + a * (c.x - p[i].x), y: p[i].y + a * (c.y - p[i].y) })) as Quad;
    return this.q;
  }
}
