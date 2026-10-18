/**
 * Optional "1× | 2×" zoom chip. Only offered when the camera track reports a zoom
 * capability reaching at least 1.5× (many Android Chrome builds do; iOS Safari usually
 * doesn't expose zoom at all, so the chip simply stays hidden there).
 * Zooming in lets the seller hold the phone further back: less wide-angle distortion and
 * no phone shadow over the card.
 */
export type ZoomLevel = 1 | 2;
export const ZOOM_STORAGE_KEY = 'autocard.zoom';
export const ZOOM_HINT = 'Use 2× and hold the phone further back to avoid shadows';

export interface ZoomRange { min: number; max: number }

export function zoomSupport(caps: unknown): ZoomRange | null {
  const z = (caps as { zoom?: { min?: number; max?: number } } | null | undefined)?.zoom;
  if (!z || typeof z !== 'object') return null;
  const max = Number(z.max), min = Number.isFinite(Number(z.min)) ? Number(z.min) : 1;
  if (!Number.isFinite(max) || max < 1.5) return null;
  return { min, max };
}

/** Zoom value to request for a chip: clamped into the track's range. */
export function zoomValue(level: ZoomLevel, range: ZoomRange): number {
  return Math.min(range.max, Math.max(range.min, level));
}

export function parseZoom(v: unknown): ZoomLevel { return v === '2' || v === 2 ? 2 : 1; }
export function loadZoom(storage: Pick<Storage, 'getItem'> | null | undefined): ZoomLevel {
  try { return parseZoom(storage?.getItem(ZOOM_STORAGE_KEY)); } catch { return 1; }
}
export function saveZoom(storage: Pick<Storage, 'setItem'> | null | undefined, z: ZoomLevel): void {
  try { storage?.setItem(ZOOM_STORAGE_KEY, String(z)); } catch { /* ignore */ }
}

/** Apply a zoom level to a live track. Resolves false when the browser refuses. */
export async function applyZoom(track: Pick<MediaStreamTrack, 'applyConstraints'> | null | undefined, level: ZoomLevel, range: ZoomRange): Promise<boolean> {
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ zoom: zoomValue(level, range) } as MediaTrackConstraintSet] });
    return true;
  } catch { return false; }
}
