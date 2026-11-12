/**
 * Pure, client-safe helpers for the header's inline search dropdown.
 *
 * The dropdown searches a small "lite" index of live listings (text fields + price only,
 * no images) that the browser downloads once and caches, so every keystroke is answered
 * locally in a few milliseconds instead of a network round trip.
 */
import { facetCategory, normalizeSize, numericPrice } from '@/lib/filters/params';
import { isPokemonListing } from '@/lib/pokemon-listings';
import { isCoinListing } from '@/lib/coin-listings';

/** One listing in the lite search index. Keep this small: it is sent for every live listing. */
export interface SearchLite {
  id: string;
  title: string;
  /** 'shoes' | 'cards' | 'other' */
  kind: SearchKind;
  price: number;
  /** Seconds since epoch (0 when unknown). */
  created: number;
  size?: string;
  year?: number;
  /** Extra searchable words (brand, model, sub-category, grade...). */
  extra?: string;
}

export type SearchKind = 'shoes' | 'cards' | 'other';
export type SearchCategory = 'all' | 'shoes' | 'cards';
export type SearchSort = 'relevance' | 'newest' | 'price-asc' | 'price-desc';

export interface PriceBucket { id: string; label: string; min: number; max?: number }

export const PRICE_BUCKETS: PriceBucket[] = [
  { id: 'u100', label: 'Under $100', min: 0, max: 100 },
  { id: '100-250', label: '$100–$250', min: 100, max: 250 },
  { id: '250-500', label: '$250–$500', min: 250, max: 500 },
  { id: '500+', label: '$500+', min: 500 },
];

export const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
];

export interface InlineFilters {
  category: SearchCategory;
  /** Normalised US size, e.g. "10" or "10.5". Only applies to shoes. */
  size?: string;
  /** PRICE_BUCKETS id. */
  price?: string;
  sort: SearchSort;
}

export const DEFAULT_FILTERS: InlineFilters = { category: 'all', sort: 'relevance' };

/** Raw Firestore listing -> lite index row; null when it must never appear in main-site search. */
export function toSearchLite(id: string, d: Record<string, any> | null | undefined): SearchLite | null {
  if (!d || typeof d.title !== 'string' || !d.title.trim()) return null;
  if (d.status !== 'available' || d.isDraft === true) return null;
  if (isPokemonListing(d) || isCoinListing(d)) return null;
  const price = numericPrice(d);
  if (!(price > 0)) return null;
  const fc = facetCategory(d.category);
  const kind: SearchKind = fc === 'sneakers' ? 'shoes' : fc === 'cards' ? 'cards' : 'other';
  const createdRaw = d.createdAt;
  const created = typeof createdRaw?.seconds === 'number' ? createdRaw.seconds
    : typeof createdRaw?._seconds === 'number' ? createdRaw._seconds
    : typeof createdRaw?.toDate === 'function' ? Math.floor(createdRaw.toDate().getTime() / 1000)
    : createdRaw instanceof Date ? Math.floor(createdRaw.getTime() / 1000)
    : 0;
  const year = Number(d.year);
  const extra = [d.brand, d.model, d.subCategory, d.manufacturer, d.gradingCompany, d.grade, d.cardNumber]
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map(String).join(' ').trim();
  const row: SearchLite = { id, title: d.title.trim(), kind, price, created };
  if (kind === 'shoes' && d.size) row.size = normalizeSize(d.size);
  if (Number.isFinite(year) && year > 1800) row.year = year;
  if (extra) row.extra = extra;
  return row;
}

/** Lower-case, strip accents/punctuation, collapse whitespace. */
export function normalizeText(s: string): string {
  return s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9.\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function tokenize(q: string): string[] {
  return normalizeText(q).split(' ').filter(Boolean);
}

/**
 * Relevance score for a row against query tokens; 0 = no match.
 * Every token must prefix-match a word in the title/extra/size/year. Title hits and
 * matches at the start of the title score higher.
 */
export function scoreRow(row: SearchLite, tokens: string[]): number {
  if (!tokens.length) return 1;
  const title = normalizeText(row.title);
  const titleWords = title.split(' ');
  const otherWords = normalizeText(`${row.extra || ''} ${row.size ? `us${row.size} ${row.size}` : ''} ${row.year || ''}`).split(' ').filter(Boolean);
  let score = 0;
  for (const t of tokens) {
    let best = 0;
    for (const w of titleWords) {
      if (w === t) { best = Math.max(best, 3); break; }
      if (w.startsWith(t)) best = Math.max(best, 2);
    }
    if (!best) {
      for (const w of otherWords) {
        if (w === t || w.startsWith(t)) { best = 1; break; }
      }
    }
    if (!best) return 0;
    score += best;
  }
  if (title.startsWith(tokens.join(' '))) score += 2;
  return score;
}

export function priceBucket(id?: string): PriceBucket | undefined {
  return id ? PRICE_BUCKETS.find((b) => b.id === id) : undefined;
}

function passesFilters(row: SearchLite, f: InlineFilters): boolean {
  if (f.category !== 'all' && row.kind !== f.category) return false;
  if (f.size && f.category === 'shoes' && row.size !== normalizeSize(f.size)) return false;
  const b = priceBucket(f.price);
  if (b) {
    if (row.price < b.min) return false;
    if (b.max !== undefined && row.price >= b.max) return false;
  }
  return true;
}

export interface InlineResult { rows: SearchLite[]; total: number }

/** Match, filter and sort the index. `limit` caps the rows returned; `total` counts all matches. */
export function searchIndex(index: SearchLite[], query: string, filters: InlineFilters, limit = 8): InlineResult {
  const tokens = tokenize(query);
  const hits: { row: SearchLite; score: number }[] = [];
  for (const row of index) {
    if (!passesFilters(row, filters)) continue;
    const score = scoreRow(row, tokens);
    if (score > 0) hits.push({ row, score });
  }
  const cmp = sortComparator(filters.sort);
  hits.sort(cmp);
  return { rows: hits.slice(0, limit).map((h) => h.row), total: hits.length };
}

export function sortComparator(sort: SearchSort) {
  return (a: { row: SearchLite; score: number }, b: { row: SearchLite; score: number }): number => {
    switch (sort) {
      case 'newest': return b.row.created - a.row.created || b.score - a.score;
      case 'price-asc': return a.row.price - b.row.price || b.score - a.score;
      case 'price-desc': return b.row.price - a.row.price || b.score - a.score;
      default: return b.score - a.score || b.row.created - a.row.created;
    }
  };
}

/** Sizes available among shoe matches for the current query (for the size filter). */
export function sizeOptions(index: SearchLite[], query: string, filters: InlineFilters): string[] {
  const tokens = tokenize(query);
  const sizes = new Set<string>();
  for (const row of index) {
    if (row.kind !== 'shoes' || !row.size) continue;
    if (!passesFilters(row, { ...filters, category: 'shoes', size: undefined })) continue;
    if (scoreRow(row, tokens) > 0) sizes.add(row.size);
  }
  return [...sizes].sort((a, b) => (Number(a) - Number(b)) || a.localeCompare(b));
}

/** Full browse page URL for the query + filters ("See all results"). */
export function buildBrowseHref(query: string, f: InlineFilters): string {
  const p = new URLSearchParams();
  const q = query.trim();
  if (q) p.set('q', q);
  if (f.category === 'shoes') p.set('category', 'Sneakers');
  if (f.category === 'cards') p.set('category', 'Collector Cards');
  if (f.category === 'shoes' && f.size) p.set('sizes', normalizeSize(f.size));
  const b = priceBucket(f.price);
  if (b) p.set('priceRange', `${b.min},${b.max ?? 100000}`);
  if (f.sort === 'newest') p.set('sort', 'createdAt-desc');
  if (f.sort === 'price-asc' || f.sort === 'price-desc') p.set('sort', f.sort);
  const qs = p.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

/** Stable cache key for a query + filters. */
export function cacheKey(query: string, f: InlineFilters): string {
  return [tokenize(query).join(' '), f.category, f.category === 'shoes' ? f.size || '' : '', f.price || '', f.sort].join('|');
}

/** Tiny LRU cache for recent query results. */
export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private max = 30) {}
  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v !== undefined) { this.map.delete(key); this.map.set(key, v); }
    return v;
  }
  set(key: string, value: V): void {
    this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.max) this.map.delete(this.map.keys().next().value as string);
  }
  clear(): void { this.map.clear(); }
  get size(): number { return this.map.size; }
}

/** "US 10 · Shoes" / "2023 · Cards" style secondary text for a result row. */
export function rowDetail(row: SearchLite): string {
  const parts: string[] = [];
  if (row.kind === 'shoes') { if (row.size) parts.push(`US ${row.size}`); parts.push('Shoes'); }
  else if (row.kind === 'cards') { if (row.year) parts.push(String(row.year)); parts.push('Cards'); }
  else if (row.year) parts.push(String(row.year));
  return parts.join(' · ');
}

export function formatAud(n: number): string {
  return `$${n.toLocaleString('en-AU', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

/** Remember recent searches (most recent first, de-duplicated, capped). */
export function pushRecent(list: string[], q: string, max = 5): string[] {
  const t = q.trim();
  if (!t) return list;
  return [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, max);
}
