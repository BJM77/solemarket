/**
 * Seller-set product centre (focal point) for listing photos.
 *
 * Stored on the listing document as an optional `imageFocalPoints` array
 * parallel to `imageUrls`. Each entry is a normalised {x, y} in 0–1 image
 * space, or null when the seller never moved the pin for that photo. Photos
 * without a pin fall back to AI smartCrop, then the centre, at display time —
 * there is no Firestore backfill.
 */
export type ImageFocalPoint = { x: number; y: number };
/** One entry per photo: a real seller pin, or null when the seller never moved it. */
export type MaybeFocalPoint = ImageFocalPoint | null;

export const DEFAULT_FOCAL_POINT: ImageFocalPoint = { x: 0.5, y: 0.5 };

export function clampFocalCoord(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return DEFAULT_FOCAL_POINT.x;
  return Math.min(1, Math.max(0, n));
}

export function normalizeFocalPoint(value: unknown): ImageFocalPoint {
  return toFocalOrNull(value) ?? { ...DEFAULT_FOCAL_POINT };
}

/**
 * A real seller pin, clamped to 0–1, or null. Missing/invalid entries are null.
 * An exact centre (0.5, 0.5) is also treated as "not set": earlier forms padded
 * every photo with it, and a hand-placed pin practically never lands exactly
 * there, so this lets AI smartCrop apply to those listings without a backfill.
 */
export function toFocalOrNull(value: unknown): MaybeFocalPoint {
  if (!value || typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const rx = typeof rec.x === 'number' ? rec.x : Number(rec.x);
  const ry = typeof rec.y === 'number' ? rec.y : Number(rec.y);
  if (rec.x == null || rec.y == null || !Number.isFinite(rx) || !Number.isFinite(ry)) return null;
  const x = clampFocalCoord(rx);
  const y = clampFocalCoord(ry);
  if (x === DEFAULT_FOCAL_POINT.x && y === DEFAULT_FOCAL_POINT.y) return null;
  return { x, y };
}

/** One entry per image (max 10): the seller's pin, or null when untouched. */
export function padFocalPoints(focals: unknown, imageCount: number): MaybeFocalPoint[] {
  const n = Math.max(0, Math.min(10, Math.floor(imageCount) || 0));
  const list = Array.isArray(focals) ? focals : [];
  return Array.from({ length: n }, (_, i) => toFocalOrNull(list[i]));
}

/**
 * Server-side sanitiser. Returns undefined when there is nothing worth storing
 * (no array, no images, or no real pins), so untouched photos and legacy
 * listings never get default pins written. Otherwise returns one entry per
 * image (null for untouched photos), clamped to 0–1, max 10.
 */
export function sanitizeImageFocalPoints(focals: unknown, imageCount: number): MaybeFocalPoint[] | undefined {
  if (!Array.isArray(focals) || imageCount <= 0) return undefined;
  const padded = padFocalPoints(focals, imageCount);
  return padded.some((p) => p != null) ? padded : undefined;
}

/**
 * Carry pins across an image list change by matching photo URLs, so removing
 * or reordering photos never moves a pin onto a different picture.
 */
export function remapFocalPointsByUrl(oldUrls: unknown, oldFocals: unknown, newUrls: unknown): MaybeFocalPoint[] {
  const before = Array.isArray(oldUrls) ? oldUrls : [];
  const pins = Array.isArray(oldFocals) ? oldFocals : [];
  const after = Array.isArray(newUrls) ? newUrls : [];
  return after.slice(0, 10).map((url) => {
    const i = before.indexOf(url);
    return i >= 0 ? toFocalOrNull(pins[i]) : null;
  });
}

/** Pick pins for the entries of `items` that pass `keep`, preserving alignment. */
export function selectFocalPoints<T>(items: T[], focals: unknown, keep: (item: T, index: number) => boolean): MaybeFocalPoint[] {
  const pins = Array.isArray(focals) ? focals : [];
  const out: MaybeFocalPoint[] = [];
  items.forEach((item, i) => {
    if (keep(item, i)) out.push(toFocalOrNull(pins[i]));
  });
  return out;
}

/**
 * Upload flows build `finalUrls = [...existing URLs, ...newly uploaded files]`;
 * reorder the pins (parallel to the form's mixed file list) the same way.
 */
export function focalsForUploadOrder(files: unknown[], focals: unknown): MaybeFocalPoint[] {
  return [
    ...selectFocalPoints(files, focals, (f) => typeof f === 'string'),
    ...selectFocalPoints(files, focals, (f) => typeof Blob !== 'undefined' && f instanceof Blob),
  ];
}

/** Where a pin lands after the photo is rotated 90° clockwise. */
export function rotateFocalPointClockwise(focal: unknown): MaybeFocalPoint {
  const p = toFocalOrNull(focal);
  if (!p) return null;
  return toFocalOrNull({ x: 1 - p.y, y: p.x });
}

export function getImageFocalPoint(focals: unknown, index = 0): ImageFocalPoint {
  const p = Array.isArray(focals) ? toFocalOrNull(focals[index]) : null;
  return p ?? { ...DEFAULT_FOCAL_POINT };
}

export function hasSellerFocal(focals: unknown, index = 0): boolean {
  return Array.isArray(focals) && toFocalOrNull(focals[index]) != null;
}

export function focalCssPosition(focal: ImageFocalPoint): string {
  const { x, y } = normalizeFocalPoint(focal);
  return `${x * 100}% ${y * 100}%`;
}

export function focalObjectPosition(focals: unknown, index = 0): string {
  return focalCssPosition(getImageFocalPoint(focals, index));
}

type CoverSource = {
  imageFocalPoints?: unknown;
  aiIntelligence?: Array<{ smartCrop?: { x?: unknown; y?: unknown } } | undefined> | unknown;
};

/**
 * CSS for crop-to-fill tiles and thumbnails.
 * Seller-set `imageFocalPoints` win over AI smartCrop; otherwise centre.
 */
export function productCoverStyle(product: CoverSource, index = 0): { objectPosition: string; transformOrigin: string } {
  if (hasSellerFocal(product.imageFocalPoints, index)) {
    const pos = focalObjectPosition(product.imageFocalPoints, index);
    return { objectPosition: pos, transformOrigin: pos };
  }
  const intelligence = Array.isArray(product.aiIntelligence) ? product.aiIntelligence[index] : undefined;
  const crop = intelligence && typeof intelligence === 'object' ? (intelligence as { smartCrop?: { x?: unknown; y?: unknown } }).smartCrop : undefined;
  if (crop && crop.x != null && crop.y != null) {
    const pos = focalCssPosition({ x: clampFocalCoord(crop.x), y: clampFocalCoord(crop.y) });
    return { objectPosition: pos, transformOrigin: pos };
  }
  return { objectPosition: '50% 50%', transformOrigin: '50% 50%' };
}

/** Visible (object-contain) rectangle of an image inside a letterboxed box. */
export function containedImageRect(
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number,
): { left: number; top: number; width: number; height: number } {
  if (!(boxW > 0) || !(boxH > 0)) return { left: 0, top: 0, width: 0, height: 0 };
  if (!(imgW > 0) || !(imgH > 0)) return { left: 0, top: 0, width: boxW, height: boxH };
  const boxRatio = boxW / boxH;
  const imgRatio = imgW / imgH;
  if (imgRatio > boxRatio) {
    const width = boxW;
    const height = boxW / imgRatio;
    return { left: 0, top: (boxH - height) / 2, width, height };
  }
  const height = boxH;
  const width = boxH * imgRatio;
  return { left: (boxW - width) / 2, top: 0, width, height };
}

export function clientPointToFocal(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  imgW: number,
  imgH: number,
): ImageFocalPoint {
  const r = containedImageRect(box.width, box.height, imgW, imgH);
  if (!(r.width > 0) || !(r.height > 0)) return { ...DEFAULT_FOCAL_POINT };
  const x = (clientX - box.left - r.left) / r.width;
  const y = (clientY - box.top - r.top) / r.height;
  return { x: clampFocalCoord(x), y: clampFocalCoord(y) };
}

/**
 * Move a pin with the keyboard: arrows move 1% (10% with Shift), Home/End jump
 * to the left/right edge. Returns null for keys that don't move the pin.
 */
export function nudgeFocalPoint(focal: unknown, key: string, big = false): ImageFocalPoint | null {
  const p = normalizeFocalPoint(focal);
  const step = big ? 0.1 : 0.01;
  const round = (n: number) => Math.round(clampFocalCoord(n) * 100) / 100;
  switch (key) {
    case 'ArrowLeft': return { x: round(p.x - step), y: p.y };
    case 'ArrowRight': return { x: round(p.x + step), y: p.y };
    case 'ArrowUp': return { x: p.x, y: round(p.y - step) };
    case 'ArrowDown': return { x: p.x, y: round(p.y + step) };
    case 'Home': return { x: 0, y: p.y };
    case 'End': return { x: 1, y: p.y };
    default: return null;
  }
}

/** Spoken position of a pin, e.g. "40% across, 25% down". */
export function describeFocalPoint(focal: unknown): string {
  const p = normalizeFocalPoint(focal);
  return `${Math.round(p.x * 100)}% across, ${Math.round(p.y * 100)}% down`;
}
