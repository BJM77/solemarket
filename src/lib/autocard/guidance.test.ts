import { describe, it, expect } from 'vitest';
import type { Pt, Quad } from './geometry';
import { computeGuidance, GuidanceSmoother, tiltCaption } from './guidance';
import { CaptureGate } from './gate';

const W = 320, H = 400;
/** Axis-aligned card quad (TL,TR,BR,BL) centred at (cx,cy). */
const card = (cx: number, cy: number, cw = 160, ch = 224): Quad => [
  { x: cx - cw / 2, y: cy - ch / 2 }, { x: cx + cw / 2, y: cy - ch / 2 },
  { x: cx + cw / 2, y: cy + ch / 2 }, { x: cx - cw / 2, y: cy + ch / 2 },
];
/** Trapezoid: top width tw, bottom width bw (keystone from vertical tilt). */
const trap = (tw: number, bw: number, ch = 224, cx = W / 2, cy = H / 2): Quad => [
  { x: cx - tw / 2, y: cy - ch / 2 }, { x: cx + tw / 2, y: cy - ch / 2 },
  { x: cx + bw / 2, y: cy + ch / 2 }, { x: cx - bw / 2, y: cy + ch / 2 },
];
/** Side keystone: left height lh, right height rh. */
const sideTrap = (lh: number, rh: number, cw = 160, cx = W / 2, cy = H / 2): Quad => [
  { x: cx - cw / 2, y: cy - lh / 2 }, { x: cx + cw / 2, y: cy - rh / 2 },
  { x: cx + cw / 2, y: cy + rh / 2 }, { x: cx - cw / 2, y: cy + lh / 2 },
];
const rotate = (q: Quad, deg: number): Quad => {
  const a = (deg * Math.PI) / 180, c = { x: W / 2, y: H / 2 };
  return q.map((p: Pt) => ({ x: c.x + (p.x - c.x) * Math.cos(a) - (p.y - c.y) * Math.sin(a), y: c.y + (p.x - c.x) * Math.sin(a) + (p.y - c.y) * Math.cos(a) })) as Quad;
};

describe('computeGuidance', () => {
  it('aligned, well-sized card -> ok', () => {
    expect(computeGuidance(card(W / 2, H / 2), W, H)).toEqual({ move: [], zoom: null, tilt: [], ok: true });
  });
  it('card left of centre -> move phone left', () => {
    expect(computeGuidance(card(100, H / 2), W, H)!.move).toEqual(['left']);
  });
  it('card right / above / below centre', () => {
    expect(computeGuidance(card(220, H / 2), W, H)!.move).toEqual(['right']);
    expect(computeGuidance(card(W / 2, 130), W, H)!.move).toEqual(['up']);
    expect(computeGuidance(card(W / 2, 270), W, H)!.move).toEqual(['down']);
  });
  it('diagonal offset lights two arrows', () => {
    expect(computeGuidance(card(100, 130), W, H)!.move.sort()).toEqual(['left', 'up']);
  });
  it('too small -> closer', () => {
    const g = computeGuidance(card(W / 2, H / 2, 60, 84), W, H)!;
    expect(g.zoom).toBe('closer');
    expect(g.ok).toBe(false);
  });
  it('clipped by frame edge -> back (and no move arrow)', () => {
    const g = computeGuidance(card(40, H / 2), W, H)!;
    expect(g.zoom).toBe('back');
    expect(g.move).toEqual([]);
  });
  it('fills too much of the frame -> back', () => {
    expect(computeGuidance(card(W / 2, H / 2, 300, 384), W, H)!.zoom).toBe('back');
  });
  it('top edge narrower than bottom -> tilt up (tip top of phone down)', () => {
    const g = computeGuidance(trap(150, 170), W, H)!;
    expect(g.tilt).toEqual(['up']);
    expect(tiltCaption(g)).toBe('Tip the top of the phone down');
  });
  it('bottom narrower -> tilt down', () => {
    expect(computeGuidance(trap(170, 150), W, H)!.tilt).toEqual(['down']);
  });
  it('left side shorter -> tilt left; right shorter -> tilt right', () => {
    expect(computeGuidance(sideTrap(210, 236), W, H)!.tilt).toEqual(['left']);
    expect(computeGuidance(sideTrap(236, 210), W, H)!.tilt).toEqual(['right']);
  });
  it('slight keystone below threshold -> no tilt', () => {
    expect(computeGuidance(trap(158, 162), W, H)!.tilt).toEqual([]);
  });
  it('rotation within the frame is fine; tilt arrows follow the screen', () => {
    expect(computeGuidance(rotate(card(W / 2, H / 2, 160, 224), 30), W, H)!.ok).toBe(true);
    // Card turned 90deg clockwise on screen: its "top" now faces screen right.
    expect(computeGuidance(rotate(trap(130, 150, 196), 90), W, H)!.tilt).toEqual(['right']);
  });
  it('no quad -> null', () => {
    expect(computeGuidance(null, W, H)).toBeNull();
  });
});

describe('hysteresis and smoothing', () => {
  it('a lit arrow stays lit until the off threshold', () => {
    const lit = computeGuidance(card(100, H / 2), W, H)!; // dx = -0.1875
    // dx = -0.125: below "on" (0.15) but above "off" (0.09)
    expect(computeGuidance(card(120, H / 2), W, H)!.move).toEqual([]);
    expect(computeGuidance(card(120, H / 2), W, H, lit)!.move).toEqual(['left']);
    expect(computeGuidance(card(140, H / 2), W, H, lit)!.move).toEqual([]);
  });
  it('smoother ignores a single outlier frame', () => {
    const s = new GuidanceSmoother();
    for (let i = 0; i < 5; i++) s.update(card(W / 2, H / 2), W, H);
    expect(s.update(card(90, H / 2), W, H)!.move).toEqual([]);
    for (let i = 0; i < 6; i++) s.update(card(90, H / 2), W, H);
    expect(s.update(card(90, H / 2), W, H)!.move).toEqual(['left']);
  });
  it('holds the last hint through brief detection drop-outs, then clears', () => {
    const s = new GuidanceSmoother(0.35, 2);
    s.update(card(W / 2, H / 2, 60, 84), W, H);
    expect(s.update(null, W, H)!.zoom).toBe('closer');
    expect(s.update(null, W, H)!.zoom).toBe('closer');
    expect(s.update(null, W, H)).toBeNull();
  });
});

describe('CaptureGate centring (matches the move arrow)', () => {
  const det = (q: Quad) => ({ quad: q, fill: 0.28, backgroundCoverage: 0.5, bgLuma: 240, width: W, height: H, surround: 1 });
  it('rejects a card far off centre with the same hint as the arrow', () => {
    expect(new CaptureGate().update(det(card(100, H / 2)), 500, 0)).toMatchObject({ ok: false, reason: 'off_centre' });
  });
  it('accepts a centred card (proceeds to the hold-still phase)', () => {
    expect(new CaptureGate().update(det(card(W / 2, H / 2)), 500, 0)).toMatchObject({ reason: 'unstable' });
  });
});
