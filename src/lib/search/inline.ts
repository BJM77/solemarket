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
  /** 1 when checked in (status "sold"); ranked below live listings. */
  sold?: 1;
  /** Seconds since epoch when an early-access listing becomes public (only set when present). */
  rel?: number;
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

/** Statuses the storefront search results page and the header dropdown both include. */
export const STOREFRONT_SEARCH_STATUSES = ['available', 'sold'] as const;

/**
 * Same eligibility the /browse?q= results page uses for shoppers: live listings
 * plus checked-in (status "sold", shown as "CHECKED IN") items. Drafts, deleted
 * listings, $0 prices and empty titles are excluded. Missing `isDraft` is treated
 * as not-a-draft (legacy rows).
 */
export function isStorefrontSearchable(d: Record<string, any> | null | undefined): boolean {
  if (!d || typeof d.title !== 'string' || !d.title.trim()) return false;
  if (d.isDraft === true) return false;
  if (!(STOREFRONT_SEARCH_STATUSES as readonly string[]).includes(String(d.status || ''))) return false;
  return numericPrice(d) > 0;
}

/** "Show all 3 listings" — always uses the true match total, never a stale "both". */
export function seeAllListingsLabel(total: number, query: string): string {
  const q = query.trim();
  if (total <= 0) return `No quick matches. Search all listings for “${q}”`;
  if (total === 1) return 'Show 1 listing';
  return `Show all ${total} listings`;
}

/** Raw Firestore listing -> lite index row; null when it must never appear in main-site search. */
export function toSearchLite(id: string, d: Record<string, any> | null | undefined): SearchLite | null {
  if (!isStorefrontSearchable(d) || !d) return null;
  if (isPokemonListing(d) || isCoinListing(d)) return null;
  const price = numericPrice(d);
  const fc = facetCategory(d.category);
  const kind: SearchKind = fc === 'sneakers' ? 'shoes' : fc === 'cards' ? 'cards' : 'other';
  const created = toEpochSeconds(d.createdAt);
  const year = Number(d.year);
  const extra = [d.brand, d.model, d.subCategory, d.manufacturer, d.player, d.gradingCompany, d.grade, d.cardNumber,
    Array.isArray(d.keywords) ? d.keywords.join(' ') : d.keywords]
    .filter((v) => v != null && v !== '')
    .map(String).join(' ').trim();
  const row: SearchLite = { id, title: d.title.trim(), kind, price, created };
  if (kind === 'shoes' && d.size) row.size = normalizeSize(d.size);
  if (Number.isFinite(year) && year > 1800) row.year = year;
  if (extra) row.extra = extra;
  if (d.status === 'sold') row.sold = 1;
  const rel = toEpochSeconds(d.publicReleaseAt);
  if (rel > 0) row.rel = rel;
  return row;
}

function toEpochSeconds(raw: any): number {
  if (!raw) return 0;
  if (typeof raw.seconds === 'number') return raw.seconds;
  if (typeof raw._seconds === 'number') return raw._seconds;
  if (typeof raw.toDate === 'function') return Math.floor(raw.toDate().getTime() / 1000);
  if (raw instanceof Date) return Math.floor(raw.getTime() / 1000);
  if (typeof raw === 'string' || typeof raw === 'number') {
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? Math.floor(t / 1000) : 0;
  }
  if (typeof raw.value === 'string') return toEpochSeconds(raw.value);
  return 0;
}

/** Early-access listings stay out of public search until their release time. */
export function isReleased(row: SearchLite, nowSec = Math.floor(Date.now() / 1000)): boolean {
  return !row.rel || row.rel <= nowSec;
}

/** Live listings always rank above checked-in (sold) ones. */
function soldLast(a: SearchLite, b: SearchLite): number {
  return (a.sold ? 1 : 0) - (b.sold ? 1 : 0);
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


/**
 * Same token match the header dropdown uses, but against a full listing record.
 * Works when `keywords` / `title_lowercase` are missing: every query token must
 * prefix-match a word in the title, brand, player, model, sub-category, or other
 * text fields.
 */
export function listingMatchesQuery(listing: Record<string, any> | null | undefined, query: string): boolean {
  const tokens = tokenize(query);
  if (!tokens.length) return true;
  if (!listing) return false;
  const title = typeof listing.title === 'string' ? listing.title : '';
  const extra = [
    listing.brand,
    listing.model,
    listing.subCategory,
    listing.manufacturer,
    listing.player,
    listing.gradingCompany,
    listing.grade,
    listing.cardNumber,
    listing.size,
    listing.year,
    Array.isArray(listing.keywords) ? listing.keywords.join(' ') : listing.keywords,
  ].filter((v) => v != null && v !== '').map(String).join(' ');
  const size = listing.size ? String(listing.size) : undefined;
  const year = Number(listing.year);
  return scoreRow({
    id: String(listing.id || 'x'),
    title: title || ' ',
    kind: 'other',
    price: 1,
    created: 0,
    size,
    year: Number.isFinite(year) && year > 1800 ? year : undefined,
    extra: extra || undefined,
  }, tokens) > 0;
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
  const nowSec = Math.floor(Date.now() / 1000);
  for (const row of index) {
    if (!isReleased(row, nowSec)) continue;
    if (!passesFilters(row, filters)) continue;
    const score = scoreRow(row, tokens);
    if (score > 0) hits.push({ row, score });
  }
  const cmp = sortComparator(filters.sort);
  hits.sort((a, b) => soldLast(a.row, b.row) || cmp(a, b));
  return { rows: hits.slice(0, limit).map((h) => h.row), total: hits.length };
}

/** Sorts the results page can answer straight from the index. */
export type IndexSort = 'createdAt-desc' | 'createdAt-asc' | 'price-asc' | 'price-desc' | 'year-asc' | 'year-desc';

export function isIndexSort(sort: string): sort is IndexSort {
  return /^(createdAt|price|year)-(asc|desc)$/.test(sort);
}

export interface IndexMatchOptions {
  /** Restrict to shoes or cards (the same split the dropdown's category chips use). */
  kind?: SearchKind;
  /** Inclusive [min, max] price. */
  priceRange?: [number, number] | null;
  /** Inclusive [min, max] year; rows without a year are excluded. */
  yearRange?: [number, number] | null;
  /** Normalised sizes; only shoe rows with one of these sizes match. */
  sizes?: string[];
  sort?: IndexSort;
  /** Business early access: include listings before their public release. */
  includeUnreleased?: boolean;
  nowSec?: number;
}

/**
 * The /browse?q= results page: every index row matching the query (same matcher and
 * eligibility as the dropdown), live listings first, then checked-in ones, each group
 * in the requested order. Returns the full ordered match list; callers page it.
 */
export function matchIndexRows(index: SearchLite[], query: string, opts: IndexMatchOptions = {}): SearchLite[] {
  const tokens = tokenize(query);
  const nowSec = opts.nowSec ?? Math.floor(Date.now() / 1000);
  const sizes = opts.sizes?.length ? new Set(opts.sizes.map((x) => normalizeSize(x))) : null;
  const hits: { row: SearchLite; score: number }[] = [];
  for (const row of index) {
    if (!opts.includeUnreleased && !isReleased(row, nowSec)) continue;
    if (opts.kind && row.kind !== opts.kind) continue;
    if (opts.priceRange && (row.price < opts.priceRange[0] || row.price > opts.priceRange[1])) continue;
    if (opts.yearRange && (!row.year || row.year < opts.yearRange[0] || row.year > opts.yearRange[1])) continue;
    if (sizes && (!row.size || !sizes.has(row.size))) continue;
    const score = scoreRow(row, tokens);
    if (score > 0) hits.push({ row, score });
  }
  const [field, dir] = (opts.sort || 'createdAt-desc').split('-') as ['createdAt' | 'price' | 'year', 'asc' | 'desc'];
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r: SearchLite): number | undefined => (field === 'price' ? r.price : field === 'year' ? r.year : r.created);
  hits.sort((a, b) => {
    const s = soldLast(a.row, b.row);
    if (s) return s;
    const va = value(a.row);
    const vb = value(b.row);
    if (va === undefined && vb !== undefined) return 1;
    if (vb === undefined && va !== undefined) return -1;
    if (va !== undefined && vb !== undefined && va !== vb) return (va - vb) * sign;
    return b.row.created - a.row.created || (a.row.id < b.row.id ? -1 : a.row.id > b.row.id ? 1 : 0);
  });
  return hits.map((h) => h.row);
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
