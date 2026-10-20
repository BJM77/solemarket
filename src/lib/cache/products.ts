import { unstable_cache } from 'next/cache';
import { getProducts } from '@/services/product-service';

/**
 * First page of a category grid (/cards, /shoes, /coins), cached per filter
 * combination for 2 minutes and busted by revalidateTag('products') whenever a
 * listing changes. Visitors no longer wait on a Firestore query per page view;
 * the client grid still loads later pages live.
 */
export const getCachedCategoryProducts = unstable_cache(
  async (params: Parameters<typeof getProducts>[0]) => getProducts(params),
  ['category-products'],
  { revalidate: 120, tags: ['products'] }
);
