import 'server-only';
import type { ProductSearchParams } from '@/lib/types';
import type { SearchDocument, SearchProvider } from './types';
import { FACET_FIELDS } from './types';
import { toTypesenseFilter, toTypesenseSort } from './mapping';

/**
 * Typesense provider (REST, no SDK). Env:
 *   TYPESENSE_HOST (e.g. xyz.a1.typesense.net), TYPESENSE_PORT (443), TYPESENSE_PROTOCOL (https)
 *   TYPESENSE_SEARCH_API_KEY (search-only key, server-side), TYPESENSE_ADMIN_API_KEY (indexing)
 *   TYPESENSE_COLLECTION (default "products")
 */
export const TYPESENSE_SCHEMA = {
  name: 'products',
  fields: [
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string', optional: true },
    { name: 'brand', type: 'string', facet: true, optional: true },
    { name: 'manufacturer', type: 'string', facet: true, optional: true },
    { name: 'category', type: 'string', facet: true },
    { name: 'subCategory', type: 'string', facet: true, optional: true },
    { name: 'condition', type: 'string', facet: true, optional: true },
    { name: 'size', type: 'string', facet: true, optional: true },
    { name: 'price', type: 'float', facet: true },
    { name: 'status', type: 'string', facet: true },
    { name: 'sellerId', type: 'string', facet: true },
    { name: 'isVerified', type: 'bool', facet: true, optional: true },
    { name: 'createdAt', type: 'int64' },
    { name: 'keywords', type: 'string[]', optional: true },
  ],
  default_sorting_field: 'createdAt',
};

function base() {
  const host = process.env.TYPESENSE_HOST;
  if (!host) throw new Error('TYPESENSE_HOST not set');
  const protocol = process.env.TYPESENSE_PROTOCOL || 'https';
  const port = process.env.TYPESENSE_PORT || (protocol === 'https' ? '443' : '8108');
  return `${protocol}://${host}:${port}/collections/${process.env.TYPESENSE_COLLECTION || 'products'}`;
}

async function call(path: string, init: RequestInit & { admin?: boolean } = {}) {
  const key = init.admin ? process.env.TYPESENSE_ADMIN_API_KEY : process.env.TYPESENSE_SEARCH_API_KEY || process.env.TYPESENSE_ADMIN_API_KEY;
  if (!key) throw new Error('Typesense API key not set');
  const res = await fetch(base() + path, {
    ...init,
    headers: { 'X-TYPESENSE-API-KEY': key, 'Content-Type': 'application/json', ...(init.headers || {}) },
    signal: AbortSignal.timeout(4000),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Typesense ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res;
}

export const typesenseProvider: SearchProvider = {
  name: 'typesense',
  async search(params: ProductSearchParams, page: number, perPage: number) {
    const qs = new URLSearchParams({
      q: params.q?.trim() || '*',
      query_by: 'title,brand,manufacturer,keywords,description',
      query_by_weights: '6,4,3,2,1',
      num_typos: '2',
      prefix: 'true',
      filter_by: toTypesenseFilter(params),
      sort_by: toTypesenseSort(params.sort),
      facet_by: FACET_FIELDS.join(','),
      max_facet_values: '30',
      page: String(page),
      per_page: String(perPage),
      include_fields: 'id',
    });
    const json: any = await (await call(`/documents/search?${qs}`)).json();
    return {
      ids: (json.hits || []).map((h: any) => h.document.id),
      total: json.found || 0,
      facets: Object.fromEntries(
        (json.facet_counts || []).map((f: any) => [f.field_name, (f.counts || []).map((c: any) => ({ value: c.value, count: c.count }))])
      ),
    };
  },
  async upsert(docs: SearchDocument[]) {
    if (!docs.length) return;
    const body = docs.map((d) => JSON.stringify(d)).join('\n');
    await call('/documents/import?action=upsert', { method: 'POST', body, admin: true, headers: { 'Content-Type': 'text/plain' } });
  },
  async remove(ids: string[]) {
    await Promise.all(ids.map((id) => call(`/documents/${encodeURIComponent(id)}`, { method: 'DELETE', admin: true }).catch(() => undefined)));
  },
};
