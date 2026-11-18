'use server';

import type { Product } from '@/lib/types';
import { isStorefrontSearchable, matchIndexRows, type IndexMatchOptions } from '@/lib/search/inline';
import { isPokemonListing } from '@/lib/pokemon-listings';
import { isCoinListing } from '@/lib/coin-listings';

const PAGE_SIZE = 24;
/** Most listings hydrated when the results page has filters the index can't answer. */
const MAX_HYDRATE = 400;

export interface TextSearchInput extends Omit<IndexMatchOptions, 'nowSec'> {
  q: string;
  /** 'page' = only this page's listings; 'all' = every match (capped) for in-memory filters. */
  mode: 'page' | 'all';
  /** Last listing id of the previous page (page mode). */
  lastId?: string;
  pageSize?: number;
  countOnly?: boolean;
}

export interface TextSearchOutput {
  products: Product[];
  /** Matches in the shared index (same number the header dropdown shows for the same filters). */
  total: number;
  hasMore: boolean;
  lastVisibleId?: string;
  /** 'all' mode only: true when more matches existed than were hydrated. */
  capped?: boolean;
}

async function hydrate(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { firestoreDb } = await import('@/lib/firebase/admin');
  const { serializeFirestoreData } = await import('@/lib/utils/serialization');
  const snaps = await firestoreDb.getAll(...ids.map((id) => firestoreDb.collection('products').doc(id)));
  const byId = new Map<string, Product>();
  for (const s of snaps) {
    if (!s.exists) continue;
    const data = { id: s.id, ...s.data() } as Record<string, any>;
    // The index may be up to 2 minutes old: re-check eligibility on the live document.
    if (!isStorefrontSearchable(data) || isPokemonListing(data) || isCoinListing(data)) continue;
    byId.set(s.id, serializeFirestoreData(data) as Product);
  }
  return ids.map((id) => byId.get(id)).filter(Boolean) as Product[];
}

/**
 * Header-dropdown parity for /browse?q=: match listing ids in the cached lite index with
 * the same matcher the dropdown uses, then read only the listings needed (a page of ~24,
 * or every match when the page has filters the index can't evaluate). Read-only.
 */
export async function textSearchListings(input: TextSearchInput): Promise<TextSearchOutput> {
  const { loadSearchIndex } = await import('@/lib/search/lite-index.server');
  const { rows } = await loadSearchIndex();
  const ranked = matchIndexRows(rows, String(input.q || ''), {
    kind: input.kind,
    priceRange: input.priceRange,
    yearRange: input.yearRange,
    sizes: input.sizes,
    sort: input.sort,
    includeUnreleased: input.includeUnreleased,
  });
  const total = ranked.length;
  if (input.countOnly) return { products: [], total, hasMore: false };

  if (input.mode === 'all') {
    const ids = ranked.slice(0, MAX_HYDRATE).map((r) => r.id);
    return { products: await hydrate(ids), total, hasMore: false, capped: total > MAX_HYDRATE };
  }

  const pageSize = Math.min(Math.max(Number(input.pageSize) || PAGE_SIZE, 1), 60);
  let start = 0;
  if (input.lastId) {
    const idx = ranked.findIndex((r) => r.id === input.lastId);
    // Unknown cursor (index rebuilt without it): end the list rather than restart at 0,
    // which would repeat results in infinite scroll.
    if (idx < 0) return { products: [], total, hasMore: false };
    start = idx + 1;
  }
  const pageRows = ranked.slice(start, start + pageSize);
  const products = await hydrate(pageRows.map((r) => r.id));
  const hasMore = start + pageRows.length < total;
  return {
    products,
    total,
    hasMore,
    // Cursor follows the index order, even if a listing dropped out since the index was built.
    lastVisibleId: pageRows.length ? pageRows[pageRows.length - 1].id : undefined,
  };
}
