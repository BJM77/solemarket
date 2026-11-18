'use client';

import { useEffect } from 'react';
import { getProductUrl } from '@/lib/utils/url';
import { recordRecentView, forgetRecentView } from '@/lib/recent-views';
import { getImageFocalPoint, hasSellerFocal } from '@/lib/images/focal-point';

type Viewable = { id?: string; title?: string; category?: string; subCategory?: string; storefrontId?: unknown; status?: string; imageUrls?: string[]; imageFocalPoints?: ({ x: number; y: number } | null)[] } | null | undefined;

/** Record a listing page view for the header's "recently viewed" strip; forget it once it's gone. */
export function useRecordRecentView(product: Viewable) {
  const id = product?.id;
  const title = product?.title;
  const status = product?.status;
  const category = product?.category;
  const subCategory = product?.subCategory;
  const storefrontId = typeof product?.storefrontId === 'string' ? product.storefrontId : undefined;
  const thumb = product?.imageUrls?.[0];
  // Depend on primitives: a fresh focal object each render would re-record on every render.
  const pinned = hasSellerFocal(product?.imageFocalPoints, 0);
  const fx = pinned ? getImageFocalPoint(product?.imageFocalPoints, 0).x : undefined;
  const fy = pinned ? getImageFocalPoint(product?.imageFocalPoints, 0).y : undefined;
  useEffect(() => {
    const focal = fx !== undefined && fy !== undefined ? { x: fx, y: fy } : undefined;
    if (!id || !title) return;
    if (status && status !== 'available') { forgetRecentView(id); return; }
    // Coin listings get /coins/... URLs, which keeps them in the coins site's own recently viewed list.
    recordRecentView({ id, title, url: getProductUrl({ id, title, category, subCategory, storefrontId }), thumb: thumb || undefined, focal });
  }, [id, title, status, category, subCategory, storefrontId, thumb, fx, fy]);
}
