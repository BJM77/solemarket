import type { Product, ProductSearchParams } from '@/lib/types';

/** Flat document stored in an external search index. Keep it small: display data is hydrated from Firestore. */
export interface SearchDocument {
  id: string;
  title: string;
  description?: string;
  brand?: string;
  manufacturer?: string;
  category: string;
  subCategory?: string;
  condition?: string;
  size?: string;
  price: number;
  status: string;
  sellerId: string;
  isVerified?: boolean;
  createdAt: number; // epoch ms
  keywords?: string[];
}

export interface SearchFacetCount { value: string; count: number }

export interface SearchResult {
  products: Product[];
  hasMore: boolean;
  /** Opaque cursor for the next page. */
  lastVisibleId?: string;
  totalCount?: number;
  facets?: Record<string, SearchFacetCount[]>;
  provider: SearchProviderName;
}

export type SearchProviderName = 'firestore' | 'typesense' | 'algolia';

export interface SearchProvider {
  name: SearchProviderName;
  /** Returns matching ids (in rank order) + paging info; products are hydrated by the caller. */
  search(params: ProductSearchParams, page: number, perPage: number): Promise<{
    ids: string[];
    total: number;
    facets?: Record<string, SearchFacetCount[]>;
  }>;
  upsert(docs: SearchDocument[]): Promise<void>;
  remove(ids: string[]): Promise<void>;
}

export const FACET_FIELDS = ['category', 'brand', 'condition', 'size'] as const;
