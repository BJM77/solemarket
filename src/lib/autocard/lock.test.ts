import { describe, it, expect } from 'vitest';
import type { Detection } from './detect';
import type { Quad } from './geometry';
import { CaptureGate, DEFAULT_GATE, LOCK } from './gate';

const W = 320, H = 427;
const card = (cx = W / 2, cy = H / 2, s = 2.6): Quad => [{ x: cx - 31.5 * s, y: cy - 44 * s }, { x: cx + 31.5 * s, y: cy - 44 * s }, { x: cx + 31.5 * s, y: cy + 44 * s }, { x: cx - 31.5 * s, y: cy + 44 * s }];
const det = (q: Quad | null): Detection => ({ quad: q, fill: q ? (63 * 88 * 2.6 * 2.6) / (W * H) : 0, backgroundCoverage: q ? 0.5 : 1, bgLuma: 240, width: W, height: H, surround: 1 });
const step = 100;

describe('LOCK tunables', () => {
  it('hold is ~1.0-1.2 s and stay thresholds are looser than enter', () => {
    expect(DEFAULT_GATE.stableMs).toBeGreaterThanOrEqual(1000);
    expect(DEFAULT_GATE.stableMs).toBeLessThanOrEqual(1200);
    expect(LOCK.graceMs).toBeGreaterThanOrEqual(400); expect(LOCK.graceMs).toBeLessThanOrEqual(600);
    expect(LOCK.jitterStay).toBeGreaterThan(LOCK.jitterEnter);
    expect(LOCK.tiltStay).toBeGreaterThan(LOCK.tiltEnter);
  });
});

describe('CaptureGate grace period', () => {
  it('a missed detection pauses the countdown instead of restarting it', () => {
    const g = new CaptureGate(); let t = 0;
    for (; t <= 500; t += step) g.update(det(card()), 500, t);
    const before = g.update(det(card()), 500, t).progress; t += step;
    const miss = g.update(det(null), 500, t); t += step;
    expect(miss).toMatchObject({ ok: false, reason: 'unstable' });
    expect(miss.progress).toBeCloseTo(before, 5); // paused, not reset, not advanced
    expect(g.heldQuad).not.toBeNull();
    const back = g.update(det(card()), 500, t);
    expect(back.progress).toBeGreaterThan(before);
  });
  it('a single frame failing a gate (blurry / glare-like) is absorbed', () => {
    const g = new CaptureGate(); let t = 0;
    for (; t <= 400; t += step) g.update(det(card()), 500, t);
    expect(g.update(det(card()), 1, t).progress).toBeGreaterThan(0); // blurry frame
  });
  it('resets once failures last longer than graceMs', () => {
    const g = new CaptureGate(); let t = 0;
    for (; t <= 500; t += step) g.update(det(card()), 500, t);
    let st = g.update(det(null), 500, t);
    for (const end = t + LOCK.graceMs; t <= end; t += step) st = g.update(det(null), 500, t);
    expect(st.progress).toBe(0);
    expect(st).toMatchObject({ reason: 'no_card' });
    expect(g.isTracking).toBe(false);
  });
  it('still fires after the full hold even with a wobble in the middle', () => {
    const g = new CaptureGate(); let t = 0, ok = false;
    for (let i = 0; i < 30 && !ok; i++, t += step) ok = g.update(det(i === 5 ? null : card()), 500, t).ok;
    expect(ok).toBe(true);
    expect(t).toBeGreaterThanOrEqual(DEFAULT_GATE.stableMs + step); // the miss frame added no time
  });
});

describe('CaptureGate hysteresis', () => {
  it('jitter between enter and stay thresholds blocks entering but not staying', () => {
    const diag = Math.hypot(W, H), dx = ((LOCK.jitterEnter + LOCK.jitterStay) / 2) * diag;
    const fresh = new CaptureGate();
    fresh.update(det(card()), 500, 0);
    // second frame enters tracking only if it passes; a jump above enter fails before tracking starts
    const g0 = new CaptureGate(); g0['last'] = card();
    expect(g0.update(det(card(W / 2 + dx)), 500, 0)).toMatchObject({ reason: 'unstable', progress: 0 });
    const g = new CaptureGate(); let t = 0;
    for (; t <= 300; t += step) g.update(det(card()), 500, t);
    const p = g.update(det(card(W / 2 + dx)), 500, t);
    expect(p.progress).toBeGreaterThan(0);
  });
  it('centring slack applies only once tracking', () => {
    const off = W / 2 + W * (DEFAULT_GATE.maxCentreOffset + LOCK.centreStayExtra / 2);
    expect(new CaptureGate().update(det(card(off)), 500, 0)).toMatchObject({ reason: 'off_centre' });
    // drift slowly from centre to the off position while tracking: never resets
    const g = new CaptureGate(); let t = 0, x = W / 2, last = 0;
    for (; x < off; x += 2, t += step) { const st = g.update(det(card(x)), 500, t); expect(st.progress).toBeGreaterThanOrEqual(last); last = st.ok ? 1 : st.progress; if (st.ok) break; }
  });
});
