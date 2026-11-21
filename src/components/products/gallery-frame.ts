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

/** The frame's shape as numbers (width / height), so it can be tested without class strings. */
export type GalleryFrameSpec = {
  /** Phones (below md): aspect ratio of the photo box. */
  phoneAspect: number;
  /** Phones: the box never grows taller than this share of the screen height. */
  phoneMaxScreenHeight: number;
  /** Tablet and desktop: aspect ratio of the photo box. */
  tabletAspect: number;
};

export function getGalleryFrameSpec(category?: string): GalleryFrameSpec {
  const kind = getGalleryFrameKind(category);
  return {
    phoneAspect: kind === 'coin' ? 1 : 4 / 5,
    phoneMaxScreenHeight: 0.6,
    tabletAspect: kind === 'card' ? 5 / 7 : 1,
  };
}

/** Phone box height for a screen: 4:5 (or square) of the width, capped at 60% of the height. */
export function phoneFrameHeight(spec: GalleryFrameSpec, screenWidth: number, screenHeight: number): number {
  return Math.min(screenWidth / spec.phoneAspect, screenHeight * spec.phoneMaxScreenHeight);
}

// Literal class names (Tailwind only generates classes it can see written out).
const PHONE_CLASSES = { coin: 'aspect-square max-md:max-h-[60svh]', other: 'aspect-[4/5] max-md:max-h-[60svh]' } as const;

export function getGalleryFrameClasses(category: string | undefined, thumbnailsSide: boolean): string {
  const kind = getGalleryFrameKind(category);
  const mobile = kind === 'coin' ? PHONE_CLASSES.coin : PHONE_CLASSES.other;
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
