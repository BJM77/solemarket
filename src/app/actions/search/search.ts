'use server';

import type { ProductSearchParams } from '@/lib/types';
import { searchProducts, configuredProvider } from '@/lib/search';
import { checkRateLimit } from '@/lib/rate-limit-guard';

/** Public search entry point used by the browse grid when an external engine is configured. */
export async function searchProductsAction(params: ProductSearchParams) {
  if (!(await checkRateLimit('search', { limit: 120, windowSeconds: 60 }))) {
    return { products: [], hasMore: false, provider: 'firestore' as const, error: 'rate_limited' };
  }
  // Public callers can never request non-available items.
  const { status: _ignored, ...safe } = params || {};
  return searchProducts(safe, 'viewer');
}

export async function getSearchProviderName() {
  return configuredProvider();
}
