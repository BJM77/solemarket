'use client';

import { useEffect } from 'react';
import { getProductUrl } from '@/lib/utils/url';
import { recordRecentView, forgetRecentView } from '@/lib/recent-views';

type Viewable = { id?: string; title?: string; category?: string; status?: string; imageUrls?: string[] } | null | undefined;

/** Record a listing page view for the header's "recently viewed" strip; forget it once it's gone. */
export function useRecordRecentView(product: Viewable) {
  const id = product?.id;
  const title = product?.title;
  const status = product?.status;
  const category = product?.category;
  const thumb = product?.imageUrls?.[0];
  useEffect(() => {
    if (!id || !title) return;
    if (status && status !== 'available') { forgetRecentView(id); return; }
    recordRecentView({ id, title, url: getProductUrl({ id, title, category }), thumb: thumb || undefined });
  }, [id, title, status, category, thumb]);
}
