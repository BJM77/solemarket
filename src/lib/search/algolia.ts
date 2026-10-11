import 'server-only';
import type { ProductSearchParams } from '@/lib/types';
import type { SearchDocument, SearchProvider } from './types';
import { FACET_FIELDS } from './types';
import { toAlgoliaFilters } from './mapping';

/**
 * Algolia provider (REST, no SDK). Env:
 *   ALGOLIA_APP_ID, ALGOLIA_SEARCH_API_KEY, ALGOLIA_ADMIN_API_KEY, ALGOLIA_INDEX (default "products")
 * Sorting by price needs replica indices "products_price_asc" / "products_price_desc" (see docs/search/SEARCH.md).
 */
function indexName(sort?: string) {
  const base = process.env.ALGOLIA_INDEX || 'products';
  if (sort === 'price-asc') return `${base}_price_asc`;
  if (sort === 'price-desc') return `${base}_price_desc`;
  if (sort === 'createdAt-desc') return `${base}_newest`;
  return base;
}

async function call(path: string, body: unknown, admin = false, method = 'POST') {
  const app = process.env.ALGOLIA_APP_ID;
  const key = admin ? process.env.ALGOLIA_ADMIN_API_KEY : process.env.ALGOLIA_SEARCH_API_KEY || process.env.ALGOLIA_ADMIN_API_KEY;
  if (!app || !key) throw new Error('Algolia credentials not set');
  const res = await fetch(`https://${app}${admin ? '' : '-dsn'}.algolia.net/1/indexes/${path}`, {
    method,
    headers: { 'X-Algolia-Application-Id': app, 'X-Algolia-API-Key': key, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Algolia ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export const algoliaProvider: SearchProvider = {
  name: 'algolia',
  async search(params: ProductSearchParams, page: number, perPage: number) {
    const { facetFilters, numericFilters } = toAlgoliaFilters(params);
    const json: any = await call(`${encodeURIComponent(indexName(params.sort))}/query`, {
      query: params.q?.trim() || '',
      page: page - 1,
      hitsPerPage: perPage,
      facetFilters,
      numericFilters,
      facets: [...FACET_FIELDS],
      attributesToRetrieve: ['objectID'],
      typoTolerance: true,
    });
    const facets: Record<string, { value: string; count: number }[]> = {};
    for (const [field, counts] of Object.entries<Record<string, number>>(json.facets || {})) {
      facets[field] = Object.entries(counts).map(([value, count]) => ({ value, count }));
    }
    return { ids: (json.hits || []).map((h: any) => h.objectID), total: json.nbHits || 0, facets };
  },
  async upsert(docs: SearchDocument[]) {
    if (!docs.length) return;
    await call(`${encodeURIComponent(process.env.ALGOLIA_INDEX || 'products')}/batch`, {
      requests: docs.map(({ id, ...rest }) => ({ action: 'updateObject', body: { objectID: id, ...rest } })),
    }, true);
  },
  async remove(ids: string[]) {
    if (!ids.length) return;
    await call(`${encodeURIComponent(process.env.ALGOLIA_INDEX || 'products')}/batch`, {
      requests: ids.map((objectID) => ({ action: 'deleteObject', body: { objectID } })),
    }, true);
  },
};
