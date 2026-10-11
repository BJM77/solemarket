import type { Product, ProductSearchParams } from '@/lib/types';
import type { SearchDocument } from './types';

function toMillis(v: any): number {
  if (!v) return Date.now();
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Date.parse(v) || Date.now();
  if (typeof v.toMillis === 'function') return v.toMillis();
  if (typeof v._seconds === 'number') return v._seconds * 1000;
  if (typeof v.seconds === 'number') return v.seconds * 1000;
  if (v instanceof Date) return v.getTime();
  return Date.now();
}

export function productToSearchDocument(id: string, p: Partial<Product> & Record<string, any>): SearchDocument {
  return {
    id,
    title: String(p.title || ''),
    description: p.description ? String(p.description).slice(0, 2000) : undefined,
    brand: p.brand || undefined,
    manufacturer: p.manufacturer || undefined,
    category: String(p.category || 'Other'),
    subCategory: p.subCategory || undefined,
    condition: p.condition || undefined,
    size: p.size != null ? String(p.size) : undefined,
    price: Number(p.price) || 0,
    status: String(p.status || 'draft'),
    sellerId: String(p.sellerId || ''),
    isVerified: !!p.isVerified,
    createdAt: toMillis(p.createdAt),
    keywords: Array.isArray(p.keywords) ? p.keywords.slice(0, 50) : undefined,
  };
}

/** Typesense filter_by string. Values are backtick-quoted to survive spaces/commas. */
export function toTypesenseFilter(params: ProductSearchParams): string {
  const q = (v: string) => '`' + String(v).replace(/`/g, '') + '`';
  const parts: string[] = ['status:=available'];
  const cats = params.categories?.length ? params.categories : params.category ? [params.category] : [];
  if (cats.length) parts.push(`category:=[${cats.map(q).join(',')}]`);
  if (params.subCategory) parts.push(`subCategory:=${q(params.subCategory)}`);
  if (params.brand) parts.push(`brand:=${q(params.brand)}`);
  if (params.manufacturer) parts.push(`manufacturer:=${q(params.manufacturer)}`);
  if (params.conditions?.length) parts.push(`condition:=[${params.conditions.map(q).join(',')}]`);
  if (params.sizes?.length) parts.push(`size:=[${params.sizes.map(q).join(',')}]`);
  if (params.verifiedOnly) parts.push('isVerified:=true');
  if (params.priceRange) parts.push(`price:[${Number(params.priceRange[0]) || 0}..${Number(params.priceRange[1]) || 1e9}]`);
  return parts.join(' && ');
}

export function toTypesenseSort(sort?: string): string {
  switch (sort) {
    case 'price-asc': return 'price:asc';
    case 'price-desc': return 'price:desc';
    case 'createdAt-desc': return 'createdAt:desc';
    default: return '_text_match:desc,createdAt:desc';
  }
}

/** Algolia facetFilters/numericFilters. */
export function toAlgoliaFilters(params: ProductSearchParams) {
  const facetFilters: (string | string[])[] = ['status:available'];
  const cats = params.categories?.length ? params.categories : params.category ? [params.category] : [];
  if (cats.length) facetFilters.push(cats.map((c) => `category:${c}`));
  if (params.subCategory) facetFilters.push(`subCategory:${params.subCategory}`);
  if (params.brand) facetFilters.push(`brand:${params.brand}`);
  if (params.manufacturer) facetFilters.push(`manufacturer:${params.manufacturer}`);
  if (params.conditions?.length) facetFilters.push(params.conditions.map((c) => `condition:${c}`));
  if (params.sizes?.length) facetFilters.push(params.sizes.map((s) => `size:${s}`));
  if (params.verifiedOnly) facetFilters.push('isVerified:true');
  const numericFilters: string[] = [];
  if (params.priceRange) {
    numericFilters.push(`price>=${Number(params.priceRange[0]) || 0}`, `price<=${Number(params.priceRange[1]) || 1e9}`);
  }
  return { facetFilters, numericFilters };
}

/** Cursor encoding for page-based engines: "p:2". */
export const encodePageCursor = (page: number) => `p:${page}`;
export function decodePageCursor(cursor?: string): number {
  const m = cursor?.match(/^p:(\d+)$/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}
