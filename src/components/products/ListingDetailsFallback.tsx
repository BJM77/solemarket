import Image from 'next/image';
import type { Product } from '@/lib/types';
import { GALLERY_SIZES } from '@/lib/listing-nav';
import { formatPrice } from '@/lib/utils/format';
import { getGalleryFrameClasses } from './gallery-frame';
import { ListingPhotoBackdrop } from './ListingPhotoBackdrop';
import { focalObjectPosition } from '@/lib/images/focal-point';

/**
 * Shown while the listing client chunk hydrates or a Suspense boundary retries.
 * The main photo uses the same src/sizes as ProductImageGallery so the browser
 * can keep the already-decoded image when the real gallery mounts, instead of
 * a blank full-screen spinner that makes the photo appear, vanish, then reload.
 */
export function ListingDetailsFallback({ product }: { product: Product }) {
  const src = product.imageUrls?.[0];
  const frameClasses = getGalleryFrameClasses(product.category, true);
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
        <div className="w-full mx-auto md:max-w-[420px] lg:max-w-none lg:mx-0 rounded-2xl">
          <div
            data-testid="listing-gallery-frame"
            className={`relative w-full mx-auto bg-background rounded-2xl overflow-hidden border border-border shadow-2xl ${frameClasses}`}
          >
            {src ? (
              <>
                <ListingPhotoBackdrop
                  src={src}
                  sizes={GALLERY_SIZES}
                  objectPosition={focalObjectPosition(product.imageFocalPoints, 0)}
                />
                <Image
                  src={src}
                  alt={product.title}
                  fill
                  priority
                  fetchPriority="high"
                  className="relative z-[1] object-contain"
                  sizes={GALLERY_SIZES}
                />
              </>
            ) : null}
          </div>
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {product.title}
          </h1>
          {Number(product.price) > 0 ? (
            <p className="text-2xl font-bold tabular-nums">${formatPrice(product.price)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
