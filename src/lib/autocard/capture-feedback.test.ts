import { describe, it, expect, vi } from 'vitest';
import { loadMuted, saveMuted, tapToFocus, vibrate, VIBRATE_PATTERN } from './capture-feedback';

describe('capture feedback', () => {
  it('vibrates where supported and is a silent no-op without it (iOS)', () => {
    const v = vi.fn(() => true);
    expect(vibrate({ vibrate: v })).toBe(true);
    expect(v).toHaveBeenCalledWith(VIBRATE_PATTERN);
    expect(vibrate({})).toBe(false);
    expect(vibrate(undefined)).toBe(false);
  });
  it('remembers mute', () => {
    const m = new Map<string, string>();
    const st = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(loadMuted(st)).toBe(false);
    saveMuted(st, true); expect(loadMuted(st)).toBe(true);
  });
  it('tap to focus does nothing without capabilities and never throws', async () => {
    const apply = vi.fn(async () => {});
    expect(await tapToFocus({ getCapabilities: () => ({}), applyConstraints: apply } as any, 0.5, 0.5)).toBe(false);
    expect(apply).not.toHaveBeenCalled();
    expect(await tapToFocus(null, 0.5, 0.5)).toBe(false);
    const bad = { getCapabilities: () => ({ focusMode: ['continuous'] }), applyConstraints: async () => { throw new Error('no'); } };
    expect(await tapToFocus(bad as any, 0.5, 0.5)).toBe(false);
    const ok = { getCapabilities: () => ({ focusMode: ['continuous'], pointsOfInterest: true }), applyConstraints: apply };
    expect(await tapToFocus(ok as any, 0.2, 0.8)).toBe(true);
    expect(apply).toHaveBeenCalledWith({ advanced: [{ focusMode: 'continuous', pointsOfInterest: [{ x: 0.2, y: 0.8 }] }] });
  });
});
