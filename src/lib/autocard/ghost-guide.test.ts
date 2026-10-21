import { describe, it, expect } from 'vitest';
import { CARD_ASPECT, quadAspect, type Quad } from './geometry';
import { GUIDE_IOU, guideQuads, guideState, quadIoU } from './ghost-guide';

const box = (x0: number, y0: number, x1: number, y1: number): Quad => [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
const shift = (q: Quad, dx: number, dy: number) => q.map((p) => ({ x: p.x + dx, y: p.y + dy })) as Quad;

describe('quadIoU', () => {
  it('is 1 for identical quads and 0 for disjoint ones', () => {
    expect(quadIoU(box(0, 0, 10, 10), box(0, 0, 10, 10))).toBeCloseTo(1, 6);
    expect(quadIoU(box(0, 0, 10, 10), box(20, 20, 30, 30))).toBe(0);
  });
  it('matches the analytic value for half-overlapping squares', () => {
    expect(quadIoU(box(0, 0, 10, 10), box(5, 0, 15, 10))).toBeCloseTo(50 / 150, 6);
  });
  it('handles a contained quad and either winding order', () => {
    const inner = box(2, 2, 8, 8);
    expect(quadIoU(box(0, 0, 10, 10), inner)).toBeCloseTo(36 / 100, 6);
    const rev = [...inner].reverse() as Quad;
    expect(quadIoU(box(0, 0, 10, 10), rev)).toBeCloseTo(36 / 100, 6);
  });
  it('works for a rotated quad (diamond inside square = 0.5)', () => {
    const diamond: Quad = [{ x: 5, y: 0 }, { x: 10, y: 5 }, { x: 5, y: 10 }, { x: 0, y: 5 }];
    expect(quadIoU(box(0, 0, 10, 10), diamond)).toBeCloseTo(0.5, 6);
  });
});

describe('guideQuads', () => {
  it('is a centred 63:88 card about 70% of view height', () => {
    const { outline, target } = guideQuads(320, 427, 'none');
    expect(quadAspect(outline)).toBeCloseTo(CARD_ASPECT, 3);
    expect((outline[3].y - outline[0].y) / 427).toBeCloseTo(0.7, 3);
    expect((outline[0].x + outline[1].x) / 2).toBeCloseTo(160, 6);
    expect(target).toEqual(outline);
  });
  it('is bigger for slabs, with the card target inside it', () => {
    const n = guideQuads(320, 427, 'none').outline, h = guideQuads(320, 427, 'hard');
    expect(h.outline[3].y - h.outline[0].y).toBeGreaterThan(n[3].y - n[0].y);
    expect(quadIoU(h.outline, h.target)).toBeLessThan(1);
  });
  it('fits narrow views', () => {
    const { outline } = guideQuads(100, 400, 'hard');
    expect(outline[1].x - outline[0].x).toBeLessThanOrEqual(90 + 1e-9);
  });
});

describe('guideState', () => {
  const w = 320, h = 427;
  const t = guideQuads(w, h, 'none').target;
  it('idle with no card, matched when on the guide, hidden when far off', () => {
    expect(guideState(null, w, h, 'none')).toBe('idle');
    expect(guideState(shift(t, 5, 5), w, h, 'none')).toBe('matched');
    expect(guideState(shift(t, 120, 0), w, h, 'none')).toBe('hidden');
  });
  it('uses the threshold', () => {
    const q = shift(t, 40, 0);
    const iou = quadIoU(q, t);
    expect(guideState(q, w, h, 'none', iou - 0.01)).toBe('matched');
    expect(guideState(q, w, h, 'none', iou + 0.01)).toBe('hidden');
    expect(GUIDE_IOU).toBeGreaterThan(0.4);
  });
});
