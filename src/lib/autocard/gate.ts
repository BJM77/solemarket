import { CARD_ASPECT, perspectiveDeg, quadAspect, quadDelta, type Quad } from './geometry';
import type { Lighting } from './lighting';
import type { Detection } from './detect';
import { shapeCheck } from './validate';
import { DEFAULT_GUIDANCE, guidanceMetrics } from './guidance';

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
  maxGlare: number;          // share of card pixels that are clipped highlights
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
  stableMs: 500,
  maxJitterFrac: 0.012,
  minSharpness: 60,
  maxPerspectiveDeg: 3.5,
  maxGlare: 0.006,
  minLuma: 45,
  minSurround: 0.7,
  // Same threshold that lights the on-screen move arrow, so the arrow and the gate agree.
  maxCentreOffset: DEFAULT_GUIDANCE.moveOn,
};

export type GateState =
  | { ok: false; reason: 'no_card' | 'not_portrait' | 'aspect' | 'too_small' | 'too_close' | 'background' | 'unstable' | 'blurry' | 'tilted' | 'glare' | 'low_light' | 'clipped' | 'shape' | 'surround' | 'off_centre'; message: string; progress: number }
  | { ok: true; message: string; progress: 1 };

/**
 * Stateful gate: feed one detection per analysed frame; returns guidance and whether
 * all criteria have held for `stableMs`.
 */
export class CaptureGate {
  private since: number | null = null;
  private last: Quad | null = null;
  constructor(private cfg: GateConfig = DEFAULT_GATE) {}

  reset() { this.since = null; this.last = null; }

  update(d: Detection, sharpness: number, now: number, light?: Lighting): GateState {
    const fail = (reason: any, message: string): GateState => { this.since = null; this.last = d.quad; return { ok: false, reason, message, progress: 0 }; };
    if (d.backgroundCoverage < this.cfg.minBackground) return fail('background', 'Use a plain white or black background');
    if (!d.quad) return fail(d.fill === 0 && d.backgroundCoverage > 0.9 ? 'no_card' : 'not_portrait', d.backgroundCoverage > 0.9 ? 'Place a card in the frame' : 'Hold the card upright (portrait)');
    if (d.clipped) return fail('clipped', 'Move back so the whole card is visible');
    if (perspectiveDeg(d.quad) > this.cfg.maxPerspectiveDeg) return fail('tilted', 'Level your phone over the card');
    const aspect = quadAspect(d.quad);
    if (Math.abs(aspect - CARD_ASPECT) > this.cfg.aspectTolerance) return fail('aspect', 'Hold the phone flat above the card');
    const shape = shapeCheck(d.quad, { maxAngleDev: 8, maxOppositeRatio: 0.06, aspectTol: this.cfg.aspectTolerance });
    if (shape) return fail('shape', 'Hold the phone flat and square above the card');
    if (d.surround !== undefined && d.surround < this.cfg.minSurround) return fail('surround', 'Move back so the whole card is visible on the background');
    if (d.fill < this.cfg.minFill) return fail('too_small', 'Move closer');
    if (d.fill > this.cfg.maxFill) return fail('too_close', 'Move back a little');
    if (d.backgroundCoverage > this.cfg.maxBackground) return fail('background', 'Move closer');
    const gm = guidanceMetrics(d.quad, d.width, d.height);
    if (Math.max(Math.abs(gm.dx), Math.abs(gm.dy)) > this.cfg.maxCentreOffset) return fail('off_centre', 'Centre the card in the frame');
    if (light && light.meanLuma < this.cfg.minLuma) return fail('low_light', 'Need more light');
    if (light && light.glare > this.cfg.maxGlare) return fail('glare', 'Tilt slightly to remove glare');
    const diag = Math.hypot(d.width, d.height);
    if (this.last && quadDelta(this.last, d.quad) > this.cfg.maxJitterFrac * diag) {
      this.last = d.quad; this.since = now;
      return { ok: false, reason: 'unstable', message: 'Hold still…', progress: 0 };
    }
    this.last = d.quad;
    if (sharpness < this.cfg.minSharpness) { this.since = now; return { ok: false, reason: 'blurry', message: 'Focusing… hold still', progress: 0 }; }
    if (this.since === null) this.since = now;
    const held = now - this.since;
    if (held >= this.cfg.stableMs) return { ok: true, message: 'Captured', progress: 1 };
    return { ok: false, reason: 'unstable', message: 'Hold still…', progress: held / this.cfg.stableMs };
  }
}
