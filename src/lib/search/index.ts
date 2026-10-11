import 'server-only';
import type { Product, ProductSearchParams } from '@/lib/types';
import type { SearchProvider, SearchProviderName, SearchResult, SearchDocument } from './types';
import { decodePageCursor, encodePageCursor, productToSearchDocument } from './mapping';

/**
 * Search adapter. Picks the provider from SEARCH_PROVIDER ("typesense" | "algolia"),
 * falling back to the existing Firestore query path when unset, misconfigured or failing.
 */
export function configuredProvider(): SearchProviderName {
  const p = (process.env.SEARCH_PROVIDER || '').toLowerCase();
  if (p === 'typesense' && process.env.TYPESENSE_HOST && (process.env.TYPESENSE_SEARCH_API_KEY || process.env.TYPESENSE_ADMIN_API_KEY)) return 'typesense';
  if (p === 'algolia' && process.env.ALGOLIA_APP_ID && (process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY)) return 'algolia';
  return 'firestore';
}

async function loadProvider(name: SearchProviderName): Promise<SearchProvider | null> {
  if (name === 'typesense') return (await import('./typesense')).typesenseProvider;
  if (name === 'algolia') return (await import('./algolia')).algoliaProvider;
  return null;
}

async function hydrate(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { firestoreDb } = await import('@/lib/firebase/admin');
  const { serializeFirestoreData } = await import('@/lib/utils/serialization');
  const refs = ids.map((id) => firestoreDb.collection('products').doc(id));
  const snaps = await (firestoreDb as any).getAll(...refs);
  const byId = new Map<string, Product>();
  for (const s of snaps) {
    if (!s.exists) continue;
    const data = s.data();
    if (data?.status !== 'available') continue; // index may lag; never show unavailable items
    byId.set(s.id, serializeFirestoreData({ id: s.id, ...data }) as Product);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

async function firestoreFallback(params: ProductSearchParams, userRole: string): Promise<SearchResult> {
  const { getProducts } = await import('@/services/product-service');
  const r = await getProducts(params, userRole);
  return { ...r, provider: 'firestore' };
}

export async function searchProducts(params: ProductSearchParams, userRole = 'viewer'): Promise<SearchResult> {
  const name = configuredProvider();
  // Admin views (status filters etc.) always use Firestore - the index only holds available items' state.
  if (name === 'firestore' || userRole === 'admin' || userRole === 'superadmin' || params.status) {
    return firestoreFallback(params, userRole);
  }
  const perPage = Math.min(Math.max(Number(params.limit) || 24, 1), 60);
  const page = decodePageCursor(params.lastId);
  try {
    const provider = (await loadProvider(name))!;
    const { ids, total, facets } = await provider.search(params, page, perPage);
    const products = await hydrate(ids);
    const hasMore = page * perPage < total;
    return { products, hasMore, lastVisibleId: hasMore ? encodePageCursor(page + 1) : undefined, totalCount: total, facets, provider: name };
  } catch (e) {
    console.error(`[search] ${name} failed, falling back to Firestore`, e);
    try { (await import('@/lib/monitoring')).reportError(e, 'search', { provider: name }); } catch { /* ignore */ }
    return firestoreFallback({ ...params, lastId: undefined }, userRole);
  }
}

/** Best-effort index sync; never throws (listing writes must not fail because search is down). */
export async function syncProductToIndex(id: string, data: Record<string, any> | null): Promise<void> {
  const name = configuredProvider();
  if (name === 'firestore') return;
  try {
    const provider = (await loadProvider(name))!;
    if (!data || data.status === 'deleted') await provider.remove([id]);
    else await provider.upsert([productToSearchDocument(id, data)]);
  } catch (e) {
    console.error('[search] index sync failed', id, e);
  }
}

export async function bulkUpsert(docs: SearchDocument[]): Promise<void> {
  const provider = await loadProvider(configuredProvider());
  if (!provider) throw new Error('No external search provider configured (SEARCH_PROVIDER)');
  await provider.upsert(docs);
}
