/** Geometry helpers for the mobile listing photo gallery (pinch, pan, swipe, double-tap). */

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2.5;
export const DOUBLE_TAP_MS = 300;
export const DOUBLE_TAP_DISTANCE_PX = 40;
export const TAP_MOVE_PX = 12;
export const SWIPE_PHOTO_PX = 60;
export const SWIPE_CLOSE_PX = 80;

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Transform = { scale: number; x: number; y: number };

export const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function clampScale(scale: number, min = MIN_SCALE, max = MAX_SCALE): number {
  if (!Number.isFinite(scale)) return min;
  return Math.min(max, Math.max(min, scale));
}

export function isZoomed(scale: number, epsilon = 0.01): boolean {
  return scale > MIN_SCALE + epsilon;
}

/** Untransformed centre of an element given its transformed bounding box and current translate. */
export function layoutOrigin(
  rect: { left: number; top: number; width: number; height: number },
  transform: Transform,
): Point {
  return {
    x: rect.left + rect.width / 2 - transform.x,
    y: rect.top + rect.height / 2 - transform.y,
  };
}

export function untransformedSize(rect: { width: number; height: number }, scale: number): Size {
  const s = scale > 0 ? scale : 1;
  return { width: rect.width / s, height: rect.height / s };
}

/**
 * Scale around the pinch midpoint so the focal point stays under the fingers.
 * `scaleRatio` is currentDistance / startDistance. `origin` is the untransformed image centre.
 */
export function pinchTransform(
  start: Transform & { midpoint: Point },
  currentMidpoint: Point,
  scaleRatio: number,
  origin: Point,
  minScale = MIN_SCALE,
  maxScale = MAX_SCALE,
): Transform {
  const scale = clampScale(start.scale * scaleRatio, minScale, maxScale);
  const startScale = start.scale === 0 ? 1 : start.scale;
  const localX = (start.midpoint.x - origin.x - start.x) / startScale;
  const localY = (start.midpoint.y - origin.y - start.y) / startScale;
  return {
    scale,
    x: currentMidpoint.x - origin.x - localX * scale,
    y: currentMidpoint.y - origin.y - localY * scale,
  };
}

export function panTransform(start: Transform, from: Point, to: Point): Transform {
  return {
    scale: start.scale,
    x: start.x + (to.x - from.x),
    y: start.y + (to.y - from.y),
  };
}

/** Zoom in around the tap, or reset to 1× when already zoomed. */
export function doubleTapTransform(
  current: Transform,
  tap: Point,
  origin: Point,
  targetScale = DOUBLE_TAP_SCALE,
): Transform {
  if (isZoomed(current.scale)) return { ...IDENTITY };
  const scale = clampScale(targetScale);
  const startScale = current.scale === 0 ? 1 : current.scale;
  const localX = (tap.x - origin.x - current.x) / startScale;
  const localY = (tap.y - origin.y - current.y) / startScale;
  return {
    scale,
    x: tap.x - origin.x - localX * scale,
    y: tap.y - origin.y - localY * scale,
  };
}

/** Keep a zoomed image from panning so far that it leaves empty space inside the viewport. */
export function clampPan(transform: Transform, viewport: Size, image: Size): Transform {
  const scale = clampScale(transform.scale);
  const maxX = Math.max(0, (image.width * scale - viewport.width) / 2);
  const maxY = Math.max(0, (image.height * scale - viewport.height) / 2);
  const clamp = (value: number, max: number) => {
    const next = Math.min(max, Math.max(-max, value));
    return next === 0 ? 0 : next;
  };
  return {
    scale,
    x: clamp(transform.x, maxX),
    y: clamp(transform.y, maxY),
  };
}

export type SwipeDirection = 'left' | 'right' | 'down' | 'up' | null;

/** Dominant-axis swipe once it clears the matching threshold. `down` is used to close the gallery. */
export function classifySwipe(
  dx: number,
  dy: number,
  { photoPx = SWIPE_PHOTO_PX, closePx = SWIPE_CLOSE_PX }: { photoPx?: number; closePx?: number } = {},
): SwipeDirection {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absY >= closePx && absY >= absX) return dy > 0 ? 'down' : 'up';
  if (absX >= photoPx && absX > absY) return dx < 0 ? 'left' : 'right';
  return null;
}

export function isDoubleTap(
  previous: { time: number; point: Point } | null,
  next: { time: number; point: Point },
  { maxMs = DOUBLE_TAP_MS, maxDistance = DOUBLE_TAP_DISTANCE_PX } = {},
): boolean {
  if (!previous) return false;
  return next.time - previous.time <= maxMs && distance(previous.point, next.point) <= maxDistance;
}

export function isTap(start: Point, end: Point, maxMove = TAP_MOVE_PX): boolean {
  return distance(start, end) <= maxMove;
}

export function wrapIndex(index: number, length: number, delta: number): number {
  if (length <= 0) return 0;
  return (((index + delta) % length) + length) % length;
}

export function counterLabel(index: number, length: number): string {
  if (length <= 0) return '0 / 0';
  return `${index + 1} / ${length}`;
}
