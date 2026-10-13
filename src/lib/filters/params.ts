/**
 * Pure helpers for marketplace sort/filter state. Shared by the grid, the filter panel,
 * the server pages and product-service so the URL, the query and the UI agree.
 */
import type { ProductSearchParams } from '@/lib/types';

export const DEFAULT_SORT = 'createdAt-desc';

/** Parse "1,2", "1-2", "$1-$2" or "1..2" into [min, max]; undefined if invalid. */
export function parseRange(value: unknown): [number, number] | undefined {
  if (Array.isArray(value) && value.length === 2) {
    const [a, b] = value.map(Number);
    return Number.isFinite(a) && Number.isFinite(b) ? (a <= b ? [a, b] : [b, a]) : undefined;
  }
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parts = value.replace(/\$/g, '').split(/\s*(?:,|\.\.|–|-(?=\d))\s*/).filter(Boolean);
  if (parts.length !== 2) return undefined;
  const a = Number(parts[0]), b = Number(parts[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined;
  return a <= b ? [a, b] : [b, a];
}

export function formatPriceRange([min, max]: [number, number]): string {
  const fmt = (n: number) => `$${n.toLocaleString('en-AU')}`;
  if (max >= 10000) return `${fmt(min)}+`;
  if (min <= 0) return `Under ${fmt(max)}`;
  return `${fmt(min)}–${fmt(max)}`;
}

/** "US 10" | "us10" | "10 US" | "Men's 10" | "10.0" -> "10". Non-numeric sizes are upper-cased as-is. */
export function normalizeSize(size: string | number | undefined | null): string {
  const s = String(size ?? '').trim();
  const m = s.match(/(\d{1,2}(?:\.\d)?)/);
  if (!m) return s.toUpperCase();
  return String(Number(m[1]));
}

/** Stored size spellings to match with a Firestore 'in' query (max 30 values). */
export function sizeQueryVariants(sizes: string[]): string[] {
  const out = new Set<string>();
  for (const raw of sizes) {
    const n = normalizeSize(raw);
    [n, `US ${n}`, `US${n}`].forEach((v) => out.add(v));
  }
  return [...out].slice(0, 30);
}

export function sizeMatches(itemSize: string | undefined | null, selected: string[]): boolean {
  if (!itemSize) return false;
  const n = normalizeSize(itemSize);
  return selected.some((s) => normalizeSize(s) === n);
}

const LIST_KEYS = new Set(['conditions', 'sellers', 'categories', 'sizes', 'gradingCompanies', 'multiCardTiers']);
const RANGE_KEYS = new Set(['priceRange', 'yearRange']);

/** URLSearchParams / Next searchParams record -> ProductSearchParams overlayed on `base`. */
export function parseFilterSearchParams(
  input: URLSearchParams | Record<string, string | string[] | undefined>,
  base: Partial<ProductSearchParams> = {}
): ProductSearchParams {
  const params: any = { ...base };
  const entries: [string, string][] = input instanceof URLSearchParams
    ? [...input.entries()]
    : Object.entries(input).flatMap(([k, v]) => (v === undefined ? [] : [[k, Array.isArray(v) ? v.join(',') : v] as [string, string]]));
  for (const [key, value] of entries) {
    if (!value) continue;
    if (RANGE_KEYS.has(key)) {
      const r = parseRange(value);
      if (r) params[key] = r;
    } else if (LIST_KEYS.has(key)) {
      params[key] = value.split(',').map((v) => v.trim()).filter(Boolean);
    } else if (key === 'verifiedOnly') {
      params[key] = value === 'true';
    } else if (key === 'minRating') {
      params[key] = Number(value) || undefined;
    } else {
      params[key] = value;
    }
  }
  if (params.sizes) params.sizes = [...new Set((params.sizes as string[]).map(normalizeSize))];
  return params as ProductSearchParams;
}

/** Keys never shown as removable "Active" chips. */
const NON_CHIP_KEYS = new Set(['view', 'sort', 'page', 'category', 'categories', 'limit', 'lastId', 'status']);

export interface ActiveChip { key: string; value?: string; label: string }

/**
 * Removable chips for filters the user actually chose: skips view/sort/paging, the page's own
 * category, the default 'available' status and anything pre-applied by the page (initialFilterState).
 */
export function activeFilterChips(params: Partial<ProductSearchParams>, pageDefaults: Partial<ProductSearchParams> = {}): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (NON_CHIP_KEYS.has(key) || value === undefined || value === null || value === '' || value === false) continue;
    const def = (pageDefaults as any)[key];
    if (def !== undefined && JSON.stringify(def) === JSON.stringify(value)) continue;
    if (key === 'brand' && params.subCategory === value) continue;
    if (key === 'priceRange' && Array.isArray(value)) { chips.push({ key, label: `Price: ${formatPriceRange(value as [number, number])}` }); continue; }
    if (key === 'yearRange' && Array.isArray(value)) { chips.push({ key, label: `Year: ${value[0]}–${value[1]}` }); continue; }
    if (Array.isArray(value)) {
      for (const v of value) {
        const prefix = key === 'sizes' ? 'Size: US ' : key === 'gradingCompanies' ? 'Grader: ' : key === 'conditions' ? '' : key === 'multiCardTiers' ? 'Deal: ' : '';
        chips.push({ key, value: String(v), label: `${prefix}${v}` });
      }
      continue;
    }
    const label = key === 'q' ? `Search: ${value}`
      : key === 'brand' || key === 'manufacturer' ? `Brand: ${value}`
      : key === 'subCategory' ? `${value}`
      : key === 'verifiedOnly' ? 'Verified sellers'
      : key === 'minRating' ? `Seller ${value}★+`
      : String(value);
    chips.push({ key, label });
  }
  return chips;
}

/** Clear all user filters but keep the page context (path + any ?category= the page was opened with). */
export function clearFiltersHref(pathname: string, current: URLSearchParams): string {
  const keep = new URLSearchParams();
  for (const k of ['category', 'view']) { const v = current.get(k); if (v) keep.set(k, v); }
  const qs = keep.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export type FacetCategory = 'sneakers' | 'cards' | 'coins' | 'all';

export function facetCategory(category?: string | null): FacetCategory {
  const c = (category || '').toLowerCase();
  if (c.includes('sneaker') || c.includes('shoe') || c.includes('footwear')) return 'sneakers';
  if (c.includes('card')) return 'cards';
  if (c.includes('coin') || c.includes('note') || c.includes('bullion')) return 'coins';
  return 'all';
}

export interface FacetConfig {
  brand: boolean; size: boolean; sneakerCondition: boolean; cardSubCategory: boolean;
  grading: boolean; manufacturer: boolean; year: boolean; dealTiers: boolean;
}

export function facetsFor(category?: string | null): FacetConfig {
  switch (facetCategory(category)) {
    case 'sneakers': return { brand: true, size: true, sneakerCondition: true, cardSubCategory: false, grading: false, manufacturer: false, year: false, dealTiers: false };
    case 'cards': return { brand: false, size: false, sneakerCondition: false, cardSubCategory: true, grading: true, manufacturer: true, year: true, dealTiers: true };
    case 'coins': return { brand: false, size: false, sneakerCondition: false, cardSubCategory: false, grading: true, manufacturer: false, year: true, dealTiers: false };
    default: return { brand: true, size: false, sneakerCondition: false, cardSubCategory: false, grading: false, manufacturer: false, year: false, dealTiers: false };
  }
}

export interface SortOption { value: string; label: string }

/** The one sort list used everywhere (toolbar + panel), tailored by category. */
export function sortOptionsFor(category?: string | null): SortOption[] {
  const base: SortOption[] = [
    { value: 'createdAt-desc', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'views-desc', label: 'Most Popular' },
  ];
  const fc = facetCategory(category);
  if (fc === 'cards' || fc === 'coins') base.push({ value: 'year-desc', label: 'Year: Newest' }, { value: 'year-asc', label: 'Year: Oldest' });
  return base;
}

export function isValidSort(sort: string | undefined, category?: string | null): boolean {
  return !!sort && sortOptionsFor(category).some((o) => o.value === sort);
}

/** Price as a number even when stored as "$1,200" or "1200". */
export function numericPrice(p: { price?: unknown }): number {
  const n = typeof p.price === 'number' ? p.price : Number(String(p.price ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Re-apply a price sort to already-loaded items. Firestore orders numbers and strings separately,
 * so legacy string prices break the server order; this keeps what the user sees correct.
 */
export function applyClientSort<T extends { price?: unknown }>(items: T[], sort?: string): T[] {
  if (sort !== 'price-asc' && sort !== 'price-desc') return items;
  const dir = sort === 'price-asc' ? 1 : -1;
  return [...items].sort((a, b) => (numericPrice(a) - numericPrice(b)) * dir);
}
