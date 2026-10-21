import { CARD_ASPECT, perspectiveDeg, quadAspect, quadDelta, type Quad } from './geometry';
import type { Lighting } from './lighting';
import type { Detection } from './detect';
import { shapeCheck } from './validate';
import { DEFAULT_GUIDANCE, guidanceMetrics } from './guidance';
import { EDGE_GLARE_THRESHOLD, GLARE_THRESHOLD, type Sleeve } from './sleeve';

/**
 * Lock tunables (one place). "Enter" thresholds must pass to start the hold countdown;
 * once tracking, looser "stay" thresholds apply, and short failures are absorbed by a
 * grace period: the countdown pauses (keeps its progress) instead of restarting.
 */
export const LOCK = {
  /** Hold time before the burst fires (was 500 ms). */
  stableMs: 1100,
  /** Bad frames (missed detection, jitter, one gate failing) tolerated for this long before reset. */
  graceMs: 500,
  /** Corner jitter, fraction of frame diagonal: enter / stay. */
  jitterEnter: 0.012,
  jitterStay: 0.022,
  /** Phone tilt (deg between opposite edges): enter / stay. */
  tiltEnter: 3.5,
  tiltStay: 5,
  /** Extra centring slack once tracking, fraction of frame width/height. */
  centreStayExtra: 0.04,
  /** Longest frame gap credited to the countdown (tab hidden / slow frame). */
  maxStepMs: 250,
} as const;

export interface GateConfig {
  aspectTolerance: number;   // |aspect - 0.716| allowed
  minFill: number;           // quad area / frame area
  maxFill: number;
  minBackground: number;     // share of frame that must be plain background
  maxBackground: number;
  stableMs: number;
  maxJitterFrac: number;     // corner movement allowed, fraction of frame diagonal
  minSharpness: number;      // Laplacian variance
  maxPerspectiveDeg: number; // max angle between opposite edges (phone tilt)
  maxGlare: number;          // share of card pixels in the largest clustered clipped-highlight blob
  maxEdgeGlare: number;      // same, inside the card's edge band (sleeve reflections over edges/corners)
  minLuma: number;           // mean card luma below this = too dark
  minSurround: number;       // outside-edge bands must match background this often
  maxCentreOffset: number;   // card centre offset from frame centre, fraction of frame width/height
}

export const DEFAULT_GATE: GateConfig = {
  aspectTolerance: 0.03,
  minFill: 0.25,
  maxFill: 0.85,
  minBackground: 0.12,
  maxBackground: 0.75,
  stableMs: LOCK.stableMs,
  maxJitterFrac: LOCK.jitterEnter,
  minSharpness: 60,
  maxPerspectiveDeg: LOCK.tiltEnter,
  maxGlare: GLARE_THRESHOLD.none,
  maxEdgeGlare: EDGE_GLARE_THRESHOLD.none,
  minLuma: 45,
  minSurround: 0.7,
  // Same threshold that lights the on-screen move arrow, so the arrow and the gate agree.
  maxCentreOffset: DEFAULT_GUIDANCE.moveOn,
};

/** Per-sleeve gate settings. Soft: slightly looser outer edge, stricter edge glare. */
export function gateConfigFor(sleeve: Sleeve): GateConfig {
  const base = { ...DEFAULT_GATE, maxGlare: GLARE_THRESHOLD[sleeve], maxEdgeGlare: EDGE_GLARE_THRESHOLD[sleeve] };
  if (sleeve === 'soft') return { ...base, aspectTolerance: 0.04, minSurround: 0.6 };
  return base;
}

export const GLARE_MESSAGE = 'Tilt away from the light';

export type GateState =
  | { ok: false; reason: 'no_card' | 'not_portrait' | 'aspect' | 'too_small' | 'too_close' | 'background' | 'unstable' | 'blurry' | 'tilted' | 'glare' | 'low_light' | 'clipped' | 'shape' | 'surround' | 'off_centre' | 'sleeve'; message: string; progress: number }
  | { ok: true; message: string; progress: 1 };

/**
 * Stateful gate: feed one detection per analysed frame; returns guidance and whether
 * all criteria have held for `stableMs`.
 */
export class CaptureGate {
  private held = 0;                 // ms of good frames accumulated toward stableMs
  private lastT: number | null = null;
  private last: Quad | null = null; // last quad compared for jitter
  private badSince: number | null = null;
  private tracking = false;
  /** Last good quad while tracking (lets the UI keep the frame up through a missed detection). */
  heldQuad: Quad | null = null;
  constructor(private cfg: GateConfig = DEFAULT_GATE, private lock: typeof LOCK = LOCK) {}

  reset() { this.held = 0; this.lastT = null; this.last = null; this.badSince = null; this.tracking = false; this.heldQuad = null; }

  /** Switch sleeve settings without losing the instance (resets the hold timer). */
  setConfig(cfg: GateConfig) { this.cfg = cfg; this.reset(); }

  get isTracking() { return this.tracking; }

  update(d: Detection, sharpness: number, now: number, light?: Lighting): GateState {
    const verdict = this.check(d, sharpness, light);
    const dt = this.lastT === null ? 0 : Math.max(0, Math.min(this.lock.maxStepMs, now - this.lastT));
    this.lastT = now;
    const progress = () => Math.min(1, this.held / this.cfg.stableMs);
    if (verdict) {
      // Grace: while tracking, a brief failure pauses the countdown instead of resetting it.
      if (this.tracking) {
        this.badSince ??= now;
        if (now - this.badSince < this.lock.graceMs) {
          if (d.quad && verdict.reason !== 'unstable') this.last = d.quad;
          return { ok: false, reason: 'unstable', message: 'Hold still…', progress: progress() };
        }
      }
      const keepLast = d.quad;
      this.reset();
      this.last = keepLast;
      return { ok: false, reason: verdict.reason as any, message: verdict.message, progress: 0 };
    }
    this.badSince = null;
    this.last = d.quad;
    this.heldQuad = d.quad;
    if (!this.tracking) { this.tracking = true; this.held = 0; }
    else this.held += dt;
    if (this.held >= this.cfg.stableMs) return { ok: true, message: 'Captured', progress: 1 };
    return { ok: false, reason: 'unstable', message: 'Hold still…', progress: progress() };
  }

  /** Per-frame checks; enter thresholds before tracking, looser stay thresholds after. Null = pass. */
  private check(d: Detection, sharpness: number, light?: Lighting): { reason: string; message: string } | null {
    const fail = (reason: string, message: string) => ({ reason, message });
    const t = this.tracking;
    const maxTilt = t ? Math.max(this.cfg.maxPerspectiveDeg, this.lock.tiltStay) : this.cfg.maxPerspectiveDeg;
    const maxJitter = t ? Math.max(this.cfg.maxJitterFrac, this.lock.jitterStay) : this.cfg.maxJitterFrac;
    const maxOff = this.cfg.maxCentreOffset + (t ? this.lock.centreStayExtra : 0);
    if (d.backgroundCoverage < this.cfg.minBackground) return fail('background', 'Use a plain white or black background');
    if (!d.quad && d.nested === 'inconsistent') return fail('sleeve', "Can't see the card's edge inside the holder. Centre the card in the sleeve and use a dark background");
    if (!d.quad) return fail(d.fill === 0 && d.backgroundCoverage > 0.9 ? 'no_card' : 'not_portrait', d.backgroundCoverage > 0.9 ? 'Place a card in the frame' : 'Hold the card upright (portrait)');
    if (d.clipped) return fail('clipped', 'Move back so the whole card is visible');
    if (perspectiveDeg(d.quad) > maxTilt) return fail('tilted', 'Level your phone over the card');
    const aspect = quadAspect(d.quad);
    if (Math.abs(aspect - CARD_ASPECT) > this.cfg.aspectTolerance) return fail('aspect', 'Hold the phone flat above the card');
    const shape = shapeCheck(d.quad, { maxAngleDev: 8, maxOppositeRatio: 0.06, aspectTol: this.cfg.aspectTolerance });
    if (shape) return fail('shape', 'Hold the phone flat and square above the card');
    if (d.surround !== undefined && d.surround < this.cfg.minSurround) return fail('surround', 'Move back so the whole card is visible on the background');
    if (d.fill < this.cfg.minFill) return fail('too_small', 'Move closer');
    if (d.fill > this.cfg.maxFill) return fail('too_close', 'Move back a little');
    if (d.backgroundCoverage > this.cfg.maxBackground) return fail('background', 'Move closer');
    const gm = guidanceMetrics(d.quad, d.width, d.height);
    if (Math.max(Math.abs(gm.dx), Math.abs(gm.dy)) > maxOff) return fail('off_centre', 'Centre the card in the frame');
    if (light && light.meanLuma < this.cfg.minLuma) return fail('low_light', 'Need more light');
    if (light && light.glare > this.cfg.maxGlare) return fail('glare', GLARE_MESSAGE);
    if (light && (light.edgeGlare ?? 0) > this.cfg.maxEdgeGlare) return fail('glare', 'Glare on the sleeve edge. ' + GLARE_MESSAGE);
    const diag = Math.hypot(d.width, d.height);
    if (this.last && quadDelta(this.last, d.quad) > maxJitter * diag) { this.last = d.quad; return fail('unstable', 'Hold still…'); }
    if (sharpness < this.cfg.minSharpness) return fail('blurry', 'Focusing… hold still');
    return null;
  }
}
