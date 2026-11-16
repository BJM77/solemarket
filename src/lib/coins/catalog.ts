import 'server-only';
import { getCachedCategoryProducts } from '@/lib/cache/products';
import { getSpotPrices } from '@/lib/coins/spot-prices';
import { spotMapFrom, type SpotMap } from '@/lib/coins/filters';
import type { Product } from '@/lib/types';

/**
 * Every live Benched Coins listing (one createdAt-sorted query, up to 500, cached for
 * two minutes) plus indicative spot prices. The coin filters and sorts run on this
 * list in memory, so they need no extra Firestore indexes.
 */
export async function loadCoinsCatalog(): Promise<{ products: Product[]; spot: SpotMap | null }> {
  const [productsResult, spotResult] = await Promise.allSettled([
    getCachedCategoryProducts({ coinsOnly: true, status: 'available', page: 1, limit: 500 }),
    getSpotPrices(),
  ]);
  if (productsResult.status === 'rejected') console.error('Coins catalog fetch failed:', productsResult.reason);
  return {
    products: productsResult.status === 'fulfilled' ? (productsResult.value.products as Product[]) : [],
    spot: spotResult.status === 'fulfilled' ? spotMapFrom(spotResult.value) : null,
  };
}
