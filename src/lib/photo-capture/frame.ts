/**
 * Framing guide maths for listing photos taken with the in-app camera.
 *
 * The camera preview shows a guide (card-shaped for cards/slabs, round for coins,
 * landscape for shoes). When the seller takes the shot we crop the full-resolution
 * frame to that guide (plus a small margin), so the item fills the listing photo.
 */

export type CaptureFrameKind = 'card' | 'coin' | 'shoe' | 'general';

export interface CaptureFrameSpec {
  kind: CaptureFrameKind;
  /** Guide width / height. */
  aspect: number;
  /** Draw the guide as a circle (coins). The crop is still the square around it. */
  round: boolean;
  label: string;
  hint: string;
}

/** Standard trading card is 2.5in x 3.5in; slabs are close enough that the same guide works. */
export const CARD_FRAME_ASPECT = 2.5 / 3.5;

const SPECS: Record<CaptureFrameKind, CaptureFrameSpec> = {
  card: { kind: 'card', aspect: CARD_FRAME_ASPECT, round: false, label: 'Card / slab', hint: 'Fill the frame, plain background, good light' },
  coin: { kind: 'coin', aspect: 1, round: true, label: 'Coin', hint: 'Fill the circle, plain background, good light' },
  shoe: { kind: 'shoe', aspect: 4 / 3, round: false, label: 'Shoe', hint: 'Fit the shoe in the frame, plain background, good light' },
  general: { kind: 'general', aspect: 4 / 5, round: false, label: 'Item', hint: 'Fill the frame, plain background, good light' },
};

export function getCaptureFrameSpec(kind: CaptureFrameKind): CaptureFrameSpec {
  return SPECS[kind] ?? SPECS.general;
}

/** Map a listing type / category / legacy capture mode to the guide shape. */
export function captureFrameKindFor(type?: string | null): CaptureFrameKind {
  const t = (type || '').toLowerCase().trim();
  if (!t) return 'general';
  if (t === 'card' || t.includes('card')) return 'card';
  if (t === 'coin' || t.includes('coin') || t.includes('bullion')) return 'coin';
  if (t === 'shoe' || t.includes('sneaker') || t.includes('shoe')) return 'shoe';
  return 'general';
}

export interface Rect { x: number; y: number; width: number; height: number }

/** Largest rect of the given aspect that fits in (maxW * w, maxH * h), centred. */
export function fitGuideRect(
  containerW: number,
  containerH: number,
  aspect: number,
  maxW = 0.86,
  maxH = 0.74,
): Rect {
  const boundW = Math.max(0, containerW * maxW);
  const boundH = Math.max(0, containerH * maxH);
  let width = boundW;
  let height = width / aspect;
  if (height > boundH) {
    height = boundH;
    width = height * aspect;
  }
  return { x: (containerW - width) / 2, y: (containerH - height) / 2, width, height };
}

/**
 * Convert a rect drawn over a <video> shown with object-fit (cover/contain) into the
 * matching rect in the video's own pixels, grown by `margin` (fraction of the rect)
 * and clamped to the frame.
 */
export function mapDisplayRectToSource(opts: {
  sourceW: number;
  sourceH: number;
  displayW: number;
  displayH: number;
  rect: Rect;
  fit?: 'cover' | 'contain';
  margin?: number;
}): Rect {
  const { sourceW, sourceH, displayW, displayH, rect, fit = 'cover', margin = 0.05 } = opts;
  const scale = fit === 'cover'
    ? Math.max(displayW / sourceW, displayH / sourceH)
    : Math.min(displayW / sourceW, displayH / sourceH);
  const offX = (displayW - sourceW * scale) / 2;
  const offY = (displayH - sourceH * scale) / 2;

  const mx = rect.width * margin;
  const my = rect.height * margin;
  let x = (rect.x - mx - offX) / scale;
  let y = (rect.y - my - offY) / scale;
  let x2 = (rect.x + rect.width + mx - offX) / scale;
  let y2 = (rect.y + rect.height + my - offY) / scale;

  x = Math.max(0, Math.min(sourceW, x));
  y = Math.max(0, Math.min(sourceH, y));
  x2 = Math.max(0, Math.min(sourceW, x2));
  y2 = Math.max(0, Math.min(sourceH, y2));

  return { x: Math.round(x), y: Math.round(y), width: Math.round(x2 - x), height: Math.round(y2 - y) };
}

/** Long edge of exported camera photos; listing storage re-encodes to a 1600px WebP master. */
export const CAPTURE_MAX_LONG_EDGE = 2000;
export const CAPTURE_JPEG_QUALITY = 0.85;

/** Scale (w, h) down so the long edge is at most `max`; never upscales. */
export function limitLongEdge(w: number, h: number, max = CAPTURE_MAX_LONG_EDGE): { width: number; height: number } {
  const long = Math.max(w, h);
  if (long <= max || long === 0) return { width: Math.round(w), height: Math.round(h) };
  const s = max / long;
  return { width: Math.round(w * s), height: Math.round(h * s) };
}
