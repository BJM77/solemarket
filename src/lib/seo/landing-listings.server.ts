import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import type { Product } from '@/lib/types';
import { firestoreDb } from '@/lib/firebase/admin';
import { matchLandingListings, matchBrandListings, type LandingMatchOptions } from '@/lib/seo/landing-listings';

/** Upper bound on live listings scanned for landing pages. */
const MAX_LIVE = 3000;

/** Fields the listing tiles, the matcher and the TCG/coin filters need (no heavy AI blobs). */
const FIELDS = [
  'title', 'price', 'oldPrice', 'marketValue', 'category', 'subCategory', 'brand', 'model', 'manufacturer',
  'size', 'year', 'condition', 'grade', 'gradingCompany', 'cardNumber', 'imageUrls', 'imageAltTexts',
  'sellerId', 'sellerName', 'status', 'isDraft', 'quantity', 'multiCardTier', 'isReverseBidding', 'isUntimed',
  'externalUrl', 'createdAt', 'updatedAt', 'storefrontId', 'description', 'specs',
];

function plain(value: any): any {
  if (value && typeof value.toDate === 'function') {
    return { seconds: Math.floor(value.toDate().getTime() / 1000), nanoseconds: 0 };
  }
  return value;
}

/**
 * Every live listing (tile fields only), cached for 10 minutes and busted by
 * revalidateTag('products') on listing writes (same tag as the header search index).
 */
const loadLive = unstable_cache(
  async (): Promise<Product[]> => {
    const snap = await firestoreDb.collection('products')
      .where('status', '==', 'available')
      .where('isDraft', '==', false)
      .select(...FIELDS)
      .limit(MAX_LIVE)
      .get();
    return snap.docs.map((doc: any) => {
      const data = doc.data() || {};
      const out: Record<string, any> = { id: doc.id };
      for (const k of Object.keys(data)) out[k] = plain(data[k]);
      return out as Product;
    });
  },
  ['landing-live-listings-v1'],
  { revalidate: 600, tags: ['products'] }
);

/** Live listings for a landing page (per-request memoised so metadata and page share one read). */
export const getLandingListings = cache(async (query: string, kind?: LandingMatchOptions['kind'], limit = 48): Promise<Product[]> => {
  try {
    return matchLandingListings(await loadLive(), { query, kind, limit });
  } catch (e) {
    console.error('[landing-listings] failed to load live listings', e);
    return [];
  }
});

/** Live listings for a /brand/<brand> page. */
export const getBrandListings = cache(async (brand: string, limit = 48): Promise<Product[]> => {
  try {
    return matchBrandListings(await loadLive(), brand, limit);
  } catch (e) {
    console.error('[landing-listings] failed to load brand listings', e);
    return [];
  }
});

/** Every live listing (tile fields only), from the same cached read. */
export const getLiveListings = cache(async (): Promise<Product[]> => {
  try {
    return await loadLive();
  } catch (e) {
    console.error('[landing-listings] failed to load live listings', e);
    return [];
  }
});
