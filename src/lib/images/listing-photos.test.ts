import { describe, expect, it } from 'vitest';
import {
  addPhotos,
  cropPhoto,
  draftPhotoFields,
  isLocalPhoto,
  listingPhotoFields,
  localFiles,
  movePhoto,
  photoFormValues,
  photoFromFile,
  photosFromUrls,
  removePhoto,
  restoreDraftPhotos,
  rotatePhoto,
  setPhotoFocal,
  type ListingPhoto,
} from './listing-photos';

const blob = (name: string) => new File([name], `${name}.jpg`, { type: 'image/jpeg' });

/** Two uploaded photos (first pinned), then two local ones (second pinned). */
function mixed(): ListingPhoto[] {
  const uploaded = photosFromUrls(['https://cdn/a.jpg', 'https://cdn/b.jpg'], [{ x: 0.2, y: 0.3 }, null]);
  const local = [photoFromFile(blob('c'), 'blob:c', 'data:c'), photoFromFile(blob('d'), 'blob:d', 'data:d')];
  return setPhotoFocal(addPhotos(uploaded, local), 3, { x: 0.9, y: 0.1 });
}

describe('listing photos', () => {
  it('builds photos from URLs with their own pins, null when untouched or centred', () => {
    const photos = photosFromUrls(['u1', 'u2', 'u3'], [{ x: 0.1, y: 0.2 }, { x: 0.5, y: 0.5 }]);
    expect(photos.map((p) => p.focal)).toEqual([{ x: 0.1, y: 0.2 }, null, null]);
    expect(photos.every((p) => p.preview === p.url && !isLocalPhoto(p))).toBe(true);
    expect(new Set(photos.map((p) => p.id)).size).toBe(3);
  });

  it('new local photos start without a pin', () => {
    const p = photoFromFile(blob('x'), 'blob:x', 'data:x');
    expect(p.focal).toBeNull();
    expect(isLocalPhoto(p)).toBe(true);
  });

  it('reorder moves the pin, file and AI copy together', () => {
    const photos = mixed();
    const moved = movePhoto(photos, 3, 0);
    expect(moved.map((p) => p.preview)).toEqual(['blob:d', 'https://cdn/a.jpg', 'https://cdn/b.jpg', 'blob:c']);
    expect(moved[0].focal).toEqual({ x: 0.9, y: 0.1 });
    expect(moved[0].base64).toBe('data:d');
    expect(moved[1].focal).toEqual({ x: 0.2, y: 0.3 });
    expect(movePhoto(photos, 9, 0)).toBe(photos);
  });

  it('remove keeps every other pin on its own photo', () => {
    const { photos, removed } = removePhoto(mixed(), 0);
    expect(removed?.url).toBe('https://cdn/a.jpg');
    expect(photos.map((p) => [p.preview, p.focal])).toEqual([
      ['https://cdn/b.jpg', null],
      ['blob:c', null],
      ['blob:d', { x: 0.9, y: 0.1 }],
    ]);
  });

  it('crop replaces the file and resets the pin', () => {
    const photos = mixed();
    const next = cropPhoto(photos, 3, { file: blob('d2'), preview: 'blob:d2', base64: 'data:d2' });
    expect(next[3]).toMatchObject({ id: photos[3].id, preview: 'blob:d2', base64: 'data:d2', focal: null });
    expect(next[0].focal).toEqual({ x: 0.2, y: 0.3 });
  });

  it('rotate turns the pin with the photo and turns an uploaded photo into a local one', () => {
    const photos = mixed();
    const next = rotatePhoto(photos, 0, { file: blob('a2'), preview: 'blob:a2', base64: 'data:a2' });
    expect(next[0].focal).toEqual({ x: 0.7, y: 0.2 });
    expect(isLocalPhoto(next[0])).toBe(true);
    expect(next[0].url).toBeUndefined();
    // Untouched photos stay untouched after a turn.
    expect(rotatePhoto(photos, 1, { file: blob('b2'), preview: 'blob:b2' })[1].focal).toBeNull();
  });

  it('form values and local files follow display order', () => {
    const photos = mixed();
    expect(photoFormValues(photos).map((v) => (typeof v === 'string' ? v : (v as File).name))).toEqual([
      'https://cdn/a.jpg', 'https://cdn/b.jpg', 'c.jpg', 'd.jpg',
    ]);
    expect(localFiles(photos).map((f) => (f as File).name)).toEqual(['c.jpg', 'd.jpg']);
  });

  it('autosave keeps only uploaded photos, each with its own pin', () => {
    const photos = movePhoto(mixed(), 3, 0); // local photo first, interleaved
    expect(draftPhotoFields(photos)).toEqual({
      imageUrls: ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
      imageFocalPoints: [{ x: 0.2, y: 0.3 }, null],
    });
    expect(draftPhotoFields([photoFromFile(blob('z'), 'blob:z')])).toBeNull();
  });

  it('publishing keeps the seller order and slots uploaded URLs into the local photos', () => {
    const photos = movePhoto(mixed(), 3, 0);
    // Local photos upload in display order: d (now first), then c.
    expect(listingPhotoFields(photos, ['https://cdn/d.jpg', 'https://cdn/c.jpg'])).toEqual({
      imageUrls: ['https://cdn/d.jpg', 'https://cdn/a.jpg', 'https://cdn/b.jpg', 'https://cdn/c.jpg'],
      imageFocalPoints: [{ x: 0.9, y: 0.1 }, { x: 0.2, y: 0.3 }, null, null],
    });
  });

  it('a draft restores saved photos with pins, then cached local files without pins', () => {
    const photos = restoreDraftPhotos(
      ['https://cdn/a.jpg', 'https://cdn/b.jpg'],
      [null, { x: 0.4, y: 0.6 }],
      [{ file: blob('c'), preview: 'blob:c', base64: 'data:c' }],
    );
    expect(photos.map((p) => [p.preview, p.focal, isLocalPhoto(p)])).toEqual([
      ['https://cdn/a.jpg', null, false],
      ['https://cdn/b.jpg', { x: 0.4, y: 0.6 }, false],
      ['blob:c', null, true],
    ]);
    expect(photos[2].base64).toBe('data:c');
    expect(restoreDraftPhotos(undefined, undefined)).toEqual([]);
  });
});
