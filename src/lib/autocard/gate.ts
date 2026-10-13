import { CARD_ASPECT, quadAspect, quadDelta, type Quad } from './geometry';
import type { Detection } from './detect';

export interface GateConfig {
  aspectTolerance: number;   // |aspect - 0.716| allowed
  minFill: number;           // quad area / frame area
  maxFill: number;
  minBackground: number;     // share of frame that must be plain background
  maxBackground: number;
  stableMs: number;
  maxJitterFrac: number;     // corner movement allowed, fraction of frame diagonal
  minSharpness: number;      // Laplacian variance
}

export const DEFAULT_GATE: GateConfig = {
  aspectTolerance: 0.05,
  minFill: 0.25,
  maxFill: 0.85,
  minBackground: 0.12,
  maxBackground: 0.75,
  stableMs: 500,
  maxJitterFrac: 0.012,
  minSharpness: 60,
};

export type GateState =
  | { ok: false; reason: 'no_card' | 'not_portrait' | 'aspect' | 'too_small' | 'too_close' | 'background' | 'unstable' | 'blurry'; message: string; progress: number }
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

  update(d: Detection, sharpness: number, now: number): GateState {
    const fail = (reason: any, message: string): GateState => { this.since = null; this.last = d.quad; return { ok: false, reason, message, progress: 0 }; };
    if (d.backgroundCoverage < this.cfg.minBackground) return fail('background', 'Use a plain white or black background');
    if (!d.quad) return fail(d.fill === 0 && d.backgroundCoverage > 0.9 ? 'no_card' : 'not_portrait', d.backgroundCoverage > 0.9 ? 'Place a card in the frame' : 'Hold the card upright (portrait)');
    const aspect = quadAspect(d.quad);
    if (Math.abs(aspect - CARD_ASPECT) > this.cfg.aspectTolerance) return fail('aspect', 'Hold the phone flat above the card');
    if (d.fill < this.cfg.minFill) return fail('too_small', 'Move closer');
    if (d.fill > this.cfg.maxFill) return fail('too_close', 'Move back a little');
    if (d.backgroundCoverage > this.cfg.maxBackground) return fail('background', 'Move closer');
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
