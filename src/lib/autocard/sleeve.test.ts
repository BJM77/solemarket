import { describe, it, expect } from 'vitest';
import { applyH, homography, type Pt, type Quad } from './geometry';
import { detectCard } from './detect';
import { locateCard } from './pipeline';
import { CaptureGate } from './gate';
import { gateConfigFor } from './gate';
import { loadSleeve, parseSleeve, saveSleeve, SLEEVE_STORAGE_KEY } from './sleeve';

/**
 * Synthetic card (63x88 mm, r=3) inside a clear, glossy holder. Card-space coordinates
 * (mm); the holder extends beyond the card by `pad` = [left, top, right, bottom].
 */
function insideRounded(u: number, v: number, x0: number, y0: number, x1: number, y1: number, r: number) {
  if (u < x0 || v < y0 || u > x1 || v > y1) return false;
  const cx = Math.min(Math.max(u, x0 + r), x1 - r), cy = Math.min(Math.max(v, y0 + r), y1 - r);
  return (u - cx) ** 2 + (v - cy) ** 2 <= r * r;
}
const cardFace = (u: number, v: number) => {
  if (u < 3.5 || u > 59.5 || v < 3.5 || v > 84.5) return 175; // silver border
  if (u > 5 && u < 58 && v > 9 && v < 45) return ((Math.floor(u / 3) + Math.floor(v / 3)) % 2) ? 245 : 15;
  if (u > 5 && u < 58 && v > 52 && v < 78) return 230;
  return 110;
};
interface Holder { pad: [number, number, number, number]; plastic: number; rim: number; strip?: { u0: number; u1: number }; label?: { v0: number; v1: number; luma: number } }
const TOPLOADER: Holder = { pad: [6.5, 6.5, 6.5, 6.5], plastic: 62, rim: 105, strip: { u0: -5, u1: -3.6 } };
const SLAB: Holder = { pad: [8, 30, 8, 8], plastic: 58, rim: 110, strip: { u0: 66, u1: 67.5 }, label: { v0: -26, v1: -8, luma: 235 } };

function render(w: number, h: number, corners: Pt[], bg: number, holder: Holder | null): Uint8Array {
  const Hinv = homography(corners, [{ x: 0, y: 0 }, { x: 63, y: 0 }, { x: 63, y: 88 }, { x: 0, y: 88 }]);
  const g = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let s = 0;
    for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) {
      const { x: u, y: v } = applyH(Hinv, { x: x + (sx + 0.5) / 2, y: y + (sy + 0.5) / 2 });
      let val = bg;
      if (holder) {
        const [l, t, r, b] = holder.pad;
        if (insideRounded(u, v, -l, -t, 63 + r, 88 + b, 1.5)) {
          val = insideRounded(u, v, -l + 0.8, -t + 0.8, 63 + r - 0.8, 88 + b - 0.8, 1.2) ? holder.plastic : holder.rim;
          if (holder.strip && u >= holder.strip.u0 && u <= holder.strip.u1 && v > -t + 2 && v < 88 + b - 2) val = 252; // glossy highlight strip
          if (holder.label && v >= holder.label.v0 && v <= holder.label.v1 && u > 1 && u < 62) val = holder.label.luma;
        }
      }
      if (insideRounded(u, v, 0, 0, 63, 88, 3)) val = cardFace(u, v);
      s += val;
    }
    g[y * w + x] = s / 4;
  }
  return g;
}
function pose(w: number, h: number, scale: number, rot: number, cx = w / 2, cy = h / 2): Quad {
  const a = (rot * Math.PI) / 180;
  return [{ x: -31.5, y: -44 }, { x: 31.5, y: -44 }, { x: 31.5, y: 44 }, { x: -31.5, y: 44 }].map(({ x, y }) => ({
    x: cx + (x * Math.cos(a) - y * Math.sin(a)) * scale, y: cy + (x * Math.sin(a) + y * Math.cos(a)) * scale,
  })) as Quad;
}
const err = (a: Quad, b: Quad) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y))) / Math.hypot(b[1].x - b[0].x, b[1].y - b[0].y);
const W = 480, H = 640;

describe('hard sleeve / slab: detect the CARD inside the plastic', () => {
  for (const rot of [0, 5, -9]) {
    it(`toploader with highlight strip, rot ${rot}°: inner card within 1.5%`, () => {
      const truth = pose(W, H, 4.6, rot);
      const g = render(W, H, truth, 18, TOPLOADER);
      // Without sleeve mode the outline would be the plastic, not the card.
      const plain = detectCard(g, W, H, 'auto');
      expect(err(plain.quad!, truth)).toBeGreaterThan(0.05);
      const d = detectCard(g, W, H, 'auto', 40, { sleeve: 'hard' });
      expect(d.nested).toBe('card');
      expect(err(d.quad!, truth)).toBeLessThan(0.04); // coarse hull quad, before edge refinement
      const loc = locateCard(g, W, H, 'auto', null, 320, 'hard')!;
      expect(loc).not.toBeNull();
      expect(err(loc.quad, truth)).toBeLessThan(0.015);
      const gate = new CaptureGate(gateConfigFor('hard'));
      let st = gate.update(d, 999, 0);
      for (let t = 100; t <= 1200; t += 100) st = gate.update(d, 999, t);
      expect(st.ok).toBe(true);
    });
  }
  it('graded slab with label: card only (no label), within 1.5%', () => {
    const truth = pose(W, H, 3.9, 3, W / 2, H / 2 + 40);
    const g = render(W, H, truth, 18, SLAB);
    const loc = locateCard(g, W, H, 'auto', null, 320, 'hard')!;
    expect(loc).not.toBeNull();
    expect(err(loc.quad, truth)).toBeLessThan(0.015);
  });
  it('plastic invisible on the background: falls back to the card outline itself', () => {
    const truth = pose(W, H, 4.6, 4);
    const g = render(W, H, truth, 18, { ...TOPLOADER, plastic: 30, rim: 40, strip: undefined });
    const d = detectCard(g, W, H, 'auto', 40, { sleeve: 'hard' });
    expect(d.nested).toBe('outer');
    expect(err(locateCard(g, W, H, 'auto', null, 320, 'hard')!.quad, truth)).toBeLessThan(0.015);
  });
  it('bare card in hard mode still locks onto the outer card edge, not the artwork', () => {
    const truth = pose(W, H, 5, -6);
    const g = render(W, H, truth, 18, null);
    expect(err(locateCard(g, W, H, 'auto', null, 320, 'hard')!.quad, truth)).toBeLessThan(0.015);
  });
  it('never returns a mixed plastic/card quad (card pushed against one side, strip touching the card)', () => {
    for (const holder of [
      { ...TOPLOADER, pad: [0.3, 6.5, 12.7, 6.5] as Holder['pad'] }, // card hard against the left plastic edge
      { ...TOPLOADER, strip: { u0: -2.5, u1: 0.5 } },                    // highlight strip overlapping the card edge
      { ...TOPLOADER, pad: [6.5, 6.5, 6.5, 0.2] as Holder['pad'] },    // card resting on the bottom edge
    ]) {
      const truth = pose(W, H, 4.4, 2);
      const g = render(W, H, truth, 18, holder);
      const d = detectCard(g, W, H, 'auto', 40, { sleeve: 'hard' });
      if (d.quad) expect(err(d.quad, truth)).toBeLessThan(0.04);
      const loc = locateCard(g, W, H, 'auto', null, 320, 'hard');
      // Either the true card, or nothing (the gate then asks to re-seat / reposition): never a mix.
      if (loc && d.quad) expect(err(loc.quad, truth)).toBeLessThan(0.015);
      if (!d.quad) {
        const st = new CaptureGate(gateConfigFor('hard')).update(d, 999, 0);
        expect(st.ok).toBe(false);
      }
    }
  });
});

describe('sleeve setting persistence', () => {
  it('parses and round-trips through storage', () => {
    const store = new Map<string, string>();
    const s = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(loadSleeve(s)).toBe('none');
    saveSleeve(s, 'hard');
    expect(store.get(SLEEVE_STORAGE_KEY)).toBe('hard');
    expect(loadSleeve(s)).toBe('hard');
    expect(parseSleeve('bogus')).toBe('none');
    expect(loadSleeve({ getItem: () => { throw new Error('denied'); } })).toBe('none');
  });
  it('soft sleeve is a little looser on edges and glare than no sleeve', () => {
    const none = gateConfigFor('none'), soft = gateConfigFor('soft');
    expect(soft.aspectTolerance).toBeGreaterThan(none.aspectTolerance);
    expect(soft.minSurround).toBeLessThan(none.minSurround);
    expect(soft.maxGlare).toBeGreaterThan(none.maxGlare);
    expect(soft.maxEdgeGlare).toBeLessThan(none.maxEdgeGlare);
  });
});
