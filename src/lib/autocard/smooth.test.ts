import { describe, it, expect } from 'vitest';
import { QuadSmoother, adaptiveAlpha, DEFAULT_SMOOTH } from './smooth';
import { CaptureGate } from './gate';
import { polygonArea, quadDelta, type Quad } from './geometry';
import type { Detection } from './detect';

const W = 320, H = 427;
const card = (cx: number, cy: number, s = 3): Quad => [
  { x: cx - 31.5 * s, y: cy - 44 * s }, { x: cx + 31.5 * s, y: cy - 44 * s }, { x: cx + 31.5 * s, y: cy + 44 * s }, { x: cx - 31.5 * s, y: cy + 44 * s },
];
const det = (q: Quad): Detection => ({ quad: q, fill: polygonArea(q) / (W * H), backgroundCoverage: 0.5, bgLuma: 20, width: W, height: H, clipped: false, surround: 1 });
function lcg(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
/** Detector-style jitter: every corner moves independently by up to ±amp px. */
const jitter = (q: Quad, amp: number, rnd: () => number) => q.map((p) => ({ x: p.x + (rnd() * 2 - 1) * amp, y: p.y + (rnd() * 2 - 1) * amp })) as Quad;

describe('adaptive EMA on quad corners', () => {
  it('alpha is ~0.25 when still and ~0.8 when moving fast', () => {
    expect(adaptiveAlpha(0)).toBeCloseTo(0.25);
    expect(adaptiveAlpha(0.1)).toBeCloseTo(0.8);
    const mid = adaptiveAlpha((DEFAULT_SMOOTH.slow + DEFAULT_SMOOTH.fast) / 2);
    expect(mid).toBeGreaterThan(0.25); expect(mid).toBeLessThan(0.8);
  });

  it('damps 1-3 px jitter on a still card', () => {
    const rnd = lcg(3), s = new QuadSmoother(), truth = card(W / 2, H / 2);
    let prevRaw: Quad | null = null, prevSm: Quad | null = null, rawMax = 0, smMax = 0;
    for (let i = 0; i < 40; i++) {
      const raw = jitter(truth, 3, rnd), sm = s.update(raw, W, H)!;
      if (i > 5) { rawMax = Math.max(rawMax, quadDelta(prevRaw!, raw)); smMax = Math.max(smMax, quadDelta(prevSm!, sm)); }
      prevRaw = raw; prevSm = sm;
    }
    expect(s.lastAlpha).toBeLessThan(0.4);
    expect(smMax).toBeLessThan(rawMax * 0.5);
    expect(quadDelta(prevSm!, truth)).toBeLessThan(2.5);
  });

  it('keeps up when the card moves fast (alpha ~0.8)', () => {
    const s = new QuadSmoother();
    s.update(card(140, 200), W, H);
    let q: Quad | null = null;
    for (let i = 1; i <= 4; i++) q = s.update(card(140 + 18 * i, 200), W, H); // ~3% of diagonal per frame
    expect(s.lastAlpha).toBeGreaterThan(0.6);
    expect(Math.abs(q![0].x - (card(212, 200)[0].x))).toBeLessThan(10);
  });

  it('snaps on a big jump and drops state after a few missed frames', () => {
    const s = new QuadSmoother();
    s.update(card(100, 200), W, H);
    expect(s.update(card(220, 200), W, H)![0].x).toBeCloseTo(card(220, 200)[0].x);
    for (let i = 0; i < 3; i++) expect(s.update(null, W, H)).toBeNull();
    expect(s.update(card(160, 200), W, H)![0].x).toBeCloseTo(card(160, 200)[0].x);
  });

  it('the capture countdown no longer restarts from jitter', () => {
    const run = (smooth: boolean) => {
      const rnd = lcg(11), s = new QuadSmoother(), gate = new CaptureGate(), truth = card(W / 2, H / 2);
      let restarts = 0, ok = false, last = 0;
      for (let i = 0; i < 12 && !ok; i++) {
        const raw = jitter(truth, 4, rnd);
        const st = gate.update(det(smooth ? s.update(raw, W, H)! : raw), 500, i * 100);
        if (st.ok) ok = true;
        if (!st.ok && st.progress < last) restarts++;
        last = st.ok ? 1 : st.progress;
      }
      return { ok, restarts };
    };
    const raw = run(false), sm = run(true);
    expect(sm.ok).toBe(true);
    expect(sm.restarts).toBe(0);
    expect(raw.ok).toBe(false);
  });
});
