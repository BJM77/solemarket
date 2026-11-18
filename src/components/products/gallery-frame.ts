import { isCardCategory, isCoinCategory } from '@/lib/constants/marketplace';

/**
 * Frame classes for the listing detail page's main photo box.
 *
 * Phones (below md): a 4:5 box (square for coins) that is capped at 60svh, so the
 * title and price stay above the fold. The photo inside is object-contain, so it is
 * never cropped; the box just letterboxes slightly when the photo is a different shape.
 *
 * Tablet/desktop keep the existing per-category ratios (cards 5:7, everything else
 * square) and width caps.
 *
 * Kept in src/components so Tailwind's content scan picks up these class names.
 */
export type GalleryFrameKind = 'card' | 'coin' | 'other';

export function getGalleryFrameKind(category?: string): GalleryFrameKind {
  if (isCoinCategory(category)) return 'coin';
  if (isCardCategory(category)) return 'card';
  return 'other';
}

export function getGalleryFrameClasses(category: string | undefined, thumbnailsSide: boolean): string {
  const kind = getGalleryFrameKind(category);
  const mobile = kind === 'coin' ? 'aspect-square max-md:max-h-[60svh]' : 'aspect-[4/5] max-md:max-h-[60svh]';
  if (kind === 'card') {
    return [
      mobile,
      'md:aspect-[5/7] md:max-w-[calc(50svh*5/7)]',
      thumbnailsSide ? 'lg:max-w-none' : 'lg:max-w-[calc(68vh*5/7)]',
    ].join(' ');
  }
  return [
    mobile,
    'md:aspect-square md:max-w-[50svh]',
    thumbnailsSide ? 'lg:max-w-none' : 'lg:max-w-[68vh]',
  ].join(' ');
}
