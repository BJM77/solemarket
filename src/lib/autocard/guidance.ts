import { dist, polygonArea, type Pt, type Quad } from './geometry';
import { isClipped } from './validate';

/**
 * AutoCard on-screen guidance: pure functions, no DOM. Unit tested.
 *
 * Turns the detected card quad (TL, TR, BR, BL from orderPortrait) and the frame size
 * into joystick-style hints for the live camera overlay:
 *   - move:  which way to MOVE THE PHONE so the card ends up centred. If the card sits
 *            left of centre, the phone moves left ('left').
 *   - zoom:  'closer' when the card is too small, 'back' when it is clipped by / touching
 *            the frame edge or fills too much of it.
 *   - tilt:  which edge of the phone to tip DOWN toward the card (drawn as an arrow with
 *            a bold "T" on it).
 *
 * Tilt mapping (consistent for all four sides):
 *   With the phone held flat above the card, the part of the card that is FARTHER from
 *   the lens looks NARROWER. If the top edge of the card looks narrower than the bottom
 *   edge, the top of the phone is raised, so the hint is "up + T" = tip the TOP of the
 *   phone down (forward, away from you). Bottom narrower -> "down + T" = tip the bottom
 *   of the phone down (towards you). Left side shorter than right -> "left + T" = tip the
 *   left side of the phone down; right shorter -> "right + T".
 *   In short: the T-arrow points at the side of the phone to lower.
 *   The narrow edge is converted to screen directions, so a card rotated in the frame
 *   (orderPortrait allows up to 45 degrees either way) still gets screen-correct arrows.
 */
export type Dir = 'up' | 'down' | 'left' | 'right';
export type Zoom = 'closer' | 'back' | null;

export interface GuidanceMetrics {
  /** card centre offset from frame centre, as a fraction of frame width / height (-0.5..0.5). */
  dx: number;
  dy: number;
  /** quad area / frame area */
  fill: number;
  clipped: boolean;
  /** keystone vector in screen space: points at the narrow (far) side; length = edge-length ratio difference. */
  tx: number;
  ty: number;
}

export interface Guidance {
  move: Dir[];
  zoom: Zoom;
  tilt: Dir[];
  /** true when no arrow is needed */
  ok: boolean;
}

export interface GuidanceConfig {
  /** centre offset (fraction of frame dim) that lights a move arrow / that turns it off again */
  moveOn: number;
  moveOff: number;
  /** fill below which "closer" lights, and above which it turns off again */
  closerOn: number;
  closerOff: number;
  /** fill above which "back" lights, and below which it turns off again */
  backOn: number;
  backOff: number;
  /** keystone ratio (|a-b|/max) that lights a tilt arrow / turns it off */
  tiltOn: number;
  tiltOff: number;
}

/** Thresholds line up with CaptureGate (minFill 0.25, maxFill 0.85, shape opposite ratio 0.06). */
export const DEFAULT_GUIDANCE: GuidanceConfig = {
  moveOn: 0.15, moveOff: 0.09,
  closerOn: 0.25, closerOff: 0.29,
  backOn: 0.85, backOff: 0.8,
  tiltOn: 0.04, tiltOff: 0.022,
};

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const unit = (from: Pt, to: Pt): Pt => { const l = dist(from, to) || 1; return { x: (to.x - from.x) / l, y: (to.y - from.y) / l }; };

export function guidanceMetrics(q: Quad, w: number, h: number): GuidanceMetrics {
  const c = { x: (q[0].x + q[1].x + q[2].x + q[3].x) / 4, y: (q[0].y + q[1].y + q[2].y + q[3].y) / 4 };
  const top = dist(q[0], q[1]), bot = dist(q[3], q[2]), left = dist(q[0], q[3]), right = dist(q[1], q[2]);
  const ratio = (a: number, b: number) => (b - a) / Math.max(a, b, 1e-9); // >0 when a is the narrower one
  // Vertical keystone: positive -> top narrower -> vector toward the top edge's midpoint.
  const v = ratio(top, bot), hz = ratio(left, right);
  const uTop = unit(c, mid(q[0], q[1])), uLeft = unit(c, mid(q[0], q[3]));
  return {
    dx: (c.x - w / 2) / w,
    dy: (c.y - h / 2) / h,
    fill: polygonArea(q) / (w * h),
    clipped: isClipped(q, w, h),
    tx: uTop.x * v + uLeft.x * hz,
    ty: uTop.y * v + uLeft.y * hz,
  };
}

/** One-shot (unsmoothed) guidance. `prev` enables hysteresis: lit arrows stay lit until the "off" threshold. */
export function guidanceFromMetrics(m: GuidanceMetrics, prev: Guidance | null = null, cfg: GuidanceConfig = DEFAULT_GUIDANCE): Guidance {
  const was = (list: Dir[] | undefined, d: Dir) => !!list?.includes(d);
  const axis = (val: number, neg: Dir, pos: Dir, on: number, off: number, last?: Dir[]): Dir | null => {
    if (val <= -(was(last, neg) ? off : on)) return neg;
    if (val >= (was(last, pos) ? off : on)) return pos;
    return null;
  };
  const move = [axis(m.dx, 'left', 'right', cfg.moveOn, cfg.moveOff, prev?.move), axis(m.dy, 'up', 'down', cfg.moveOn, cfg.moveOff, prev?.move)].filter(Boolean) as Dir[];
  const tilt = [axis(m.tx, 'left', 'right', cfg.tiltOn, cfg.tiltOff, prev?.tilt), axis(m.ty, 'up', 'down', cfg.tiltOn, cfg.tiltOff, prev?.tilt)].filter(Boolean) as Dir[];
  let zoom: Zoom = null;
  if (m.clipped || m.fill >= (prev?.zoom === 'back' ? cfg.backOff : cfg.backOn)) zoom = 'back';
  else if (m.fill <= (prev?.zoom === 'closer' ? cfg.closerOff : cfg.closerOn)) zoom = 'closer';
  // When the card is cut off, centring info is unreliable; "move back" wins.
  const mv = zoom === 'back' && m.clipped ? [] : move;
  return { move: mv, zoom, tilt, ok: !mv.length && !zoom && !tilt.length };
}

export function computeGuidance(q: Quad | null, w: number, h: number, prev: Guidance | null = null, cfg: GuidanceConfig = DEFAULT_GUIDANCE): Guidance | null {
  if (!q) return null;
  return guidanceFromMetrics(guidanceMetrics(q, w, h), prev, cfg);
}

/**
 * Exponential moving average over the metrics plus hysteresis on the arrows, so the
 * overlay doesn't flicker from frame to frame. Briefly lost detections keep the last
 * hint for `holdFrames` frames.
 */
export class GuidanceSmoother {
  private m: GuidanceMetrics | null = null;
  private g: Guidance | null = null;
  private misses = 0;
  constructor(private alpha = 0.35, private holdFrames = 3, private cfg: GuidanceConfig = DEFAULT_GUIDANCE) {}

  reset() { this.m = null; this.g = null; this.misses = 0; }

  update(q: Quad | null, w: number, h: number): Guidance | null {
    if (!q) {
      if (++this.misses > this.holdFrames) this.reset();
      return this.g;
    }
    this.misses = 0;
    const n = guidanceMetrics(q, w, h);
    const a = this.alpha, p = this.m;
    this.m = p
      ? { dx: p.dx + a * (n.dx - p.dx), dy: p.dy + a * (n.dy - p.dy), fill: p.fill + a * (n.fill - p.fill), tx: p.tx + a * (n.tx - p.tx), ty: p.ty + a * (n.ty - p.ty), clipped: n.clipped }
      : n;
    this.g = guidanceFromMetrics(this.m, this.g, this.cfg);
    return this.g;
  }
}

const TILT_TEXT: Record<Dir, string> = {
  up: 'Tip the top of the phone down',
  down: 'Tip the bottom of the phone down',
  left: 'Tip the left side of the phone down',
  right: 'Tip the right side of the phone down',
};

/** Short caption for a tilt hint, used in place of the generic "Level your phone" text. */
export function tiltCaption(g: Guidance | null): string | null {
  if (!g?.tilt.length) return null;
  return g.tilt.map((d) => TILT_TEXT[d]).join(' and ').replace(/ and Tip/, ' and tip');
}
