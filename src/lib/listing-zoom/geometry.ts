/** Hover in the top zone this long before the zoom overlay opens. */
export const ZOOM_HOVER_DELAY_MS = 1000;

/** Top fraction of the listing image that arms the hold-to-zoom trigger. */
export const ZOOM_ZONE_RATIO = 0.2;

/** Diameter of the circular zoom lens in the overlay, in pixels. */
export const ZOOM_LENS_SIZE_PX = 180;

/** Magnification of the overlay lens relative to the enlarged image. */
export const ZOOM_LENS_SCALE = 2.5;

/** Pointer can drift this far outside the enlarged image before the overlay closes. */
export const ZOOM_LEAVE_LENIENCY_PX = 40;

export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function isInTopHoverZone(
  clientX: number,
  clientY: number,
  rect: RectLike,
  zoneRatio: number = ZOOM_ZONE_RATIO,
): boolean {
  if (rect.width <= 0 || rect.height <= 0 || zoneRatio <= 0) return false;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x > rect.width || y > rect.height) return false;
  return y <= rect.height * zoneRatio;
}

export function isOutsideImageWithLeniency(
  clientX: number,
  clientY: number,
  rect: RectLike,
  leniencyPx: number = ZOOM_LEAVE_LENIENCY_PX,
): boolean {
  if (rect.width <= 0 || rect.height <= 0) return true;
  const pad = Math.max(0, leniencyPx);
  return (
    clientX < rect.left - pad ||
    clientX > rect.left + rect.width + pad ||
    clientY < rect.top - pad ||
    clientY > rect.top + rect.height + pad
  );
}

/** CSS background-position (percent) so the lens is centred on the pointer. */
export function lensBackgroundPosition(
  clientX: number,
  clientY: number,
  rect: RectLike,
): { x: number; y: number } {
  if (rect.width <= 0 || rect.height <= 0) return { x: 50, y: 50 };
  const x = ((clientX - rect.left) / rect.width) * 100;
  const y = ((clientY - rect.top) / rect.height) * 100;
  return {
    x: Math.min(100, Math.max(0, x)),
    y: Math.min(100, Math.max(0, y)),
  };
}
