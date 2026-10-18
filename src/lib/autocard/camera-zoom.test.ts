import { describe, it, expect, vi } from 'vitest';
import { applyZoom, loadZoom, saveZoom, zoomSupport, zoomValue, ZOOM_STORAGE_KEY } from './camera-zoom';

describe('zoom chip support', () => {
  it('only shows when the track reports zoom with max >= 1.5', () => {
    expect(zoomSupport({})).toBeNull();                         // iOS Safari: no zoom capability
    expect(zoomSupport(undefined)).toBeNull();
    expect(zoomSupport({ zoom: { min: 1, max: 1.2 } })).toBeNull();
    expect(zoomSupport({ zoom: { min: 1, max: 1.5 } })).toEqual({ min: 1, max: 1.5 });
    expect(zoomSupport({ zoom: { min: 1, max: 8 } })).toEqual({ min: 1, max: 8 });
  });
  it('clamps the requested zoom into the range', () => {
    expect(zoomValue(2, { min: 1, max: 1.6 })).toBe(1.6);
    expect(zoomValue(1, { min: 1.2, max: 5 })).toBe(1.2);
    expect(zoomValue(2, { min: 1, max: 5 })).toBe(2);
  });
  it('applies via applyConstraints({ advanced: [{ zoom }] }) and reports refusal', async () => {
    const ok = { applyConstraints: vi.fn().mockResolvedValue(undefined) };
    expect(await applyZoom(ok, 2, { min: 1, max: 10 })).toBe(true);
    expect(ok.applyConstraints).toHaveBeenCalledWith({ advanced: [{ zoom: 2 }] });
    const bad = { applyConstraints: vi.fn().mockRejectedValue(new Error('OverconstrainedError')) };
    expect(await applyZoom(bad, 2, { min: 1, max: 10 })).toBe(false);
    expect(await applyZoom(null, 2, { min: 1, max: 10 })).toBe(false);
  });
  it('persists the choice', () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(loadZoom(s)).toBe(1);
    saveZoom(s, 2);
    expect(m.get(ZOOM_STORAGE_KEY)).toBe('2');
    expect(loadZoom(s)).toBe(2);
  });
});
