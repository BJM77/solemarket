import Image from 'next/image';

type Props = {
  src: string;
  sizes: string;
  /** Keep identical to the foreground Image so Next serves one cached URL. */
  quality?: number;
  objectPosition?: string;
};

/**
 * Soft, slightly darkened copy of the listing photo that fills the frame
 * behind an uncropped (object-contain) foreground. Same src/sizes/quality
 * as the main photo so the browser can reuse the already-fetched image.
 */
export function ListingPhotoBackdrop({ src, sizes, quality, objectPosition = '50% 50%' }: Props) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      quality={quality}
      aria-hidden
      className="listing-photo-blur"
      style={{ objectPosition }}
    />
  );
}
