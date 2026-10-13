/**
 * Upload-time image pipeline helpers.
 *
 * Every product photo is stored as a WebP "master" (max 2048px) plus smaller
 * WebP renditions. next/image (images.unoptimized=false) then serves AVIF/WebP
 * at the exact rendered size; the stored renditions keep the origin small and
 * give non-Next consumers (emails, feeds, OG) a cheap thumbnail.
 */
export const IMAGE_VARIANT_WIDTHS = [400, 1000] as const;
export const MASTER_MAX_DIMENSION = 2048;
export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/** Replace the extension of a storage path and add a width suffix: a/b/123-x.jpg -> a/b/123-x-w400.webp */
export function variantPath(masterPath: string, width?: number): string {
  const base = masterPath.replace(/\.[a-zA-Z0-9]+$/, '');
  return width ? `${base}-w${width}.webp` : `${base}.webp`;
}

/** Make a filename safe for storage and force a .webp extension. */
export function safeWebpFilename(name: string | undefined, now = Date.now()): string {
  const cleaned = (name || 'image').replace(/\.[a-zA-Z0-9]+$/, '').replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 80) || 'image';
  return `${now}-${cleaned}.webp`;
}
