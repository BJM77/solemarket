/**
 * One array of photo objects for the sell form, instead of parallel arrays of
 * files, previews, AI copies and pins that could drift out of line.
 *
 * Each photo is either already uploaded (`url` set, preview is that URL) or
 * local (`file` set, preview is a blob: URL). The stored listing shape is
 * unchanged: `imageUrls` plus `imageFocalPoints` (null for untouched photos;
 * the server drops the field when no photo has a pin).
 */
import { rotateFocalPointClockwise, toFocalOrNull, type ImageFocalPoint, type MaybeFocalPoint } from './focal-point';

export const MAX_LISTING_PHOTOS = 10;

export type ListingPhoto = {
  /** Stable key for React and for finding a photo after async work. */
  id: string;
  /** Local file not uploaded yet. */
  file?: File | Blob;
  /** What the form shows: the uploaded URL or a blob: URL for local files. */
  preview: string;
  /** Small JPEG data URI for AI vision calls (local files only). */
  base64?: string;
  /** Storage URL once uploaded. */
  url?: string;
  /** Seller pin, or null when untouched. */
  focal: MaybeFocalPoint;
};

let seq = 0;
export function newPhotoId(): string {
  seq += 1;
  return `p${Date.now().toString(36)}_${seq}`;
}

export function isLocalPhoto(p: ListingPhoto): boolean {
  return !p.url && p.file != null;
}

export function photosFromUrls(urls: unknown, focals?: unknown): ListingPhoto[] {
  const list = Array.isArray(urls) ? urls.filter((u): u is string => typeof u === 'string' && u.length > 0) : [];
  const pins = Array.isArray(focals) ? focals : [];
  return list.slice(0, MAX_LISTING_PHOTOS).map((url, i) => ({ id: newPhotoId(), url, preview: url, focal: toFocalOrNull(pins[i]) }));
}

export function photoFromFile(file: File | Blob, preview: string, base64?: string): ListingPhoto {
  return { id: newPhotoId(), file, preview, base64, focal: null };
}

export function addPhotos(photos: ListingPhoto[], added: ListingPhoto[]): ListingPhoto[] {
  return [...photos, ...added].slice(0, MAX_LISTING_PHOTOS);
}

export function removePhoto(photos: ListingPhoto[], index: number): { photos: ListingPhoto[]; removed?: ListingPhoto } {
  if (index < 0 || index >= photos.length) return { photos };
  return { photos: photos.filter((_, i) => i !== index), removed: photos[index] };
}

/** Move a photo (and its pin, file and AI copy with it). Index 0 is the main photo. */
export function movePhoto(photos: ListingPhoto[], from: number, to: number): ListingPhoto[] {
  if (from < 0 || from >= photos.length || from === to) return photos;
  const target = Math.max(0, Math.min(photos.length - 1, to));
  const next = [...photos];
  const [p] = next.splice(from, 1);
  next.splice(target, 0, p);
  return next;
}

export function setPhotoFocal(photos: ListingPhoto[], index: number, focal: ImageFocalPoint | null): ListingPhoto[] {
  if (index < 0 || index >= photos.length) return photos;
  return photos.map((p, i) => (i === index ? { ...p, focal: toFocalOrNull(focal) } : p));
}

type Replacement = { file: File | Blob; preview: string; base64?: string };

/** A cropped copy replaces the photo; its old pin no longer matches, so it resets. */
export function cropPhoto(photos: ListingPhoto[], index: number, next: Replacement): ListingPhoto[] {
  if (index < 0 || index >= photos.length) return photos;
  return photos.map((p, i) => (i === index ? { id: p.id, file: next.file, preview: next.preview, base64: next.base64, focal: null } : p));
}

/** A copy turned 90° clockwise replaces the photo; the pin turns with it. */
export function rotatePhoto(photos: ListingPhoto[], index: number, next: Replacement): ListingPhoto[] {
  if (index < 0 || index >= photos.length) return photos;
  return photos.map((p, i) =>
    i === index ? { id: p.id, file: next.file, preview: next.preview, base64: next.base64, focal: rotateFocalPointClockwise(p.focal) } : p,
  );
}

/** Value for the form's `imageFiles` field (URLs for uploaded photos, files for local ones). */
export function photoFormValues(photos: ListingPhoto[]): (string | File | Blob)[] {
  return photos.map((p) => p.url ?? (p.file as File | Blob));
}

export function localFiles(photos: ListingPhoto[]): (File | Blob)[] {
  return photos.filter(isLocalPhoto).map((p) => p.file as File | Blob);
}

/** Autosave fields: only photos already uploaded, each keeping its own pin. */
export function draftPhotoFields(photos: ListingPhoto[]): { imageUrls: string[]; imageFocalPoints: MaybeFocalPoint[] } | null {
  const uploaded = photos.filter((p) => !isLocalPhoto(p) && p.url);
  if (!uploaded.length) return null;
  return { imageUrls: uploaded.map((p) => p.url as string), imageFocalPoints: uploaded.map((p) => p.focal) };
}

/**
 * Listing fields after uploading local files. `uploadedUrls` are the URLs for
 * the local photos, in order. Photos keep the order the seller sees.
 */
export function listingPhotoFields(
  photos: ListingPhoto[],
  uploadedUrls: string[],
): { imageUrls: string[]; imageFocalPoints: MaybeFocalPoint[] } {
  let next = 0;
  const imageUrls: string[] = [];
  const imageFocalPoints: MaybeFocalPoint[] = [];
  for (const p of photos) {
    const url = isLocalPhoto(p) ? uploadedUrls[next++] : p.url;
    if (!url) continue;
    imageUrls.push(url);
    imageFocalPoints.push(p.focal);
  }
  return { imageUrls, imageFocalPoints };
}

/**
 * Rebuild a draft: saved photos (with their pins) first, then local files
 * recovered from the browser cache (no pins yet, previews made by the caller).
 */
export function restoreDraftPhotos(
  urls: unknown,
  focals: unknown,
  cached: { file: File | Blob; preview: string; base64?: string }[] = [],
): ListingPhoto[] {
  return addPhotos(photosFromUrls(urls, focals), cached.map((c) => photoFromFile(c.file, c.preview, c.base64)));
}

export function revokePhotoPreview(p: ListingPhoto | undefined): void {
  if (p && p.preview.startsWith('blob:') && typeof URL !== 'undefined' && URL.revokeObjectURL) URL.revokeObjectURL(p.preview);
}
