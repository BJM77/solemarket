/**
 * Benched Coins header search: a small "lite" index of live coin and bullion
 * listings (text + price + the facts the dropdown filters and sorts on),
 * searched in the browser on every keystroke. Pure and client-safe.
 */
import { isCoinListing } from '@/lib/coin-listings';
import { getProductUrl } from '@/lib/utils/url';
import { tokenize, scoreRow, type SearchLite } from '@/lib/search/inline';
import { coinFacets, METAL_LABELS, type CoinKind, type CoinMetal } from './facets';
import { coinTileBadge } from './display';
import { coinFiltersToParams, hasSpot, PRICE_BUCKETS, type CoinFilters, type CoinSort, type SpotMap } from './filters';

export interface CoinSearchLite {
  id: string;
  title: string;
  url: string;
  price: number;
  /** Seconds since epoch (0 when unknown). */
  created: number;
  kind: CoinKind;
  metal?: CoinMetal;
  /** Fine troy ounces (bullion with weight + purity). */
  fineOz?: number;
  year?: number;
  /** Short facts for the result row, e.g. "1 oz Gold · Bullion". */
  detail?: string;
  /** Extra searchable words (denomination, mint, country, grade...). */
  extra?: string;
}

export type CoinInlineType = 'all' | 'coins' | 'bullion' | 'banknotes';
export type CoinInlineSort = 'relevance' | Exclude<CoinSort, 'year-asc' | 'year-desc'>;

export interface CoinInlineFilters {
  type: CoinInlineType;
  metal?: CoinMetal;
  /** PRICE_BUCKETS id. */
  price?: string;
  sort: CoinInlineSort;
}

export const DEFAULT_COIN_INLINE_FILTERS: CoinInlineFilters = { type: 'all', sort: 'relevance' };

export const COIN_INLINE_TYPES: { v: CoinInlineType; l: string }[] = [
  { v: 'all', l: 'All' },
  { v: 'coins', l: 'Coins' },
  { v: 'bullion', l: 'Bullion' },
  { v: 'banknotes', l: 'Banknotes' },
];

/** Dropdown sorts; the spot-price ones only appear when they can work. */
export function coinInlineSorts(opts: { spot?: SpotMap | null; anyFineWeight?: boolean }): { value: CoinInlineSort; label: string }[] {
  const out: { value: CoinInlineSort; label: string }[] = [
    { value: 'relevance', label: 'Best match' },
    { value: 'newest', label: 'Newest' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
  ];
  if (opts.anyFineWeight) out.push({ value: 'ppo-asc', label: 'Price per oz' });
  if (opts.anyFineWeight && hasSpot(opts.spot)) out.push({ value: 'premium-asc', label: 'Lowest premium over spot' });
  return out;
}

const createdSeconds = (v: unknown): number => {
  const o = v as any;
  if (typeof o?.seconds === 'number') return o.seconds;
  if (typeof o?._seconds === 'number') return o._seconds;
  if (typeof o?.toDate === 'function') { try { return Math.floor(o.toDate().getTime() / 1000); } catch { return 0; } }
  if (o instanceof Date) return Math.floor(o.getTime() / 1000);
  if (typeof o === 'string') { const t = Date.parse(o); return Number.isNaN(t) ? 0 : Math.floor(t / 1000); }
  if (typeof o === 'number') return o > 1e12 ? Math.floor(o / 1000) : o;
  return 0;
};

/** Raw Firestore listing -> coin index row; null unless it's a live coin/bullion listing. */
export function toCoinSearchLite(id: string, d: Record<string, any> | null | undefined): CoinSearchLite | null {
  if (!d || typeof d.title !== 'string' || !d.title.trim()) return null;
  if (d.status !== 'available' || d.isDraft === true) return null;
  if (!isCoinListing(d)) return null;
  const f = coinFacets(d);
  if (!(f.price > 0)) return null;
  const kindLabel = f.kind === 'bullion' ? 'Bullion' : f.kind === 'banknote' ? 'Banknote' : 'Coin';
  const badge = coinTileBadge(d, f);
  const detail = [badge, f.kind !== 'bullion' ? f.country : undefined, kindLabel].filter(Boolean).join(' · ');
  const extra = [f.denomination, f.mint, f.country, f.metal ? METAL_LABELS[f.metal] : undefined, d.subCategory, f.gradingCompany, f.grade, d.weight, d.purity]
    .filter((v) => typeof v === 'string' || typeof v === 'number').map(String).join(' ').trim();
  const row: CoinSearchLite = {
    id,
    title: d.title.trim(),
    url: getProductUrl({ id, title: d.title, category: 'Coins' }),
    price: f.price,
    created: createdSeconds(d.createdAt),
    kind: f.kind,
  };
  if (f.metal) row.metal = f.metal;
  if (f.fineOz) row.fineOz = Math.round(f.fineOz * 10000) / 10000;
  if (f.year) row.year = f.year;
  if (detail) row.detail = detail;
  if (extra) row.extra = extra;
  return row;
}

function asLite(row: CoinSearchLite): SearchLite {
  return { id: row.id, title: row.title, kind: 'other', price: row.price, created: row.created, year: row.year, extra: row.extra };
}

function passes(row: CoinSearchLite, f: CoinInlineFilters): boolean {
  if (f.type === 'coins' && row.kind !== 'coin') return false;
  if (f.type === 'bullion' && row.kind !== 'bullion') return false;
  if (f.type === 'banknotes' && row.kind !== 'banknote') return false;
  if (f.metal && row.metal !== f.metal) return false;
  const b = f.price ? PRICE_BUCKETS.find((x) => x.id === f.price) : undefined;
  if (b) {
    if (b.min !== undefined && row.price < b.min) return false;
    if (b.max !== undefined && row.price >= b.max) return false;
  }
  return true;
}

const perOz = (r: CoinSearchLite) => (r.fineOz ? r.price / r.fineOz : undefined);
const premium = (r: CoinSearchLite, spot?: SpotMap | null) => {
  if (!r.fineOz || !r.metal || r.metal === 'base' || !spot) return undefined;
  const s = spot[r.metal];
  return s ? r.price / (r.fineOz * s) - 1 : undefined;
};

/** Match, filter and sort the coin index. */
export function searchCoinIndex(index: CoinSearchLite[], query: string, f: CoinInlineFilters, spot?: SpotMap | null, limit = 8): { rows: CoinSearchLite[]; total: number } {
  const tokens = tokenize(query);
  const hits: { row: CoinSearchLite; score: number }[] = [];
  for (const row of index) {
    if (!passes(row, f)) continue;
    const score = scoreRow(asLite(row), tokens);
    if (score > 0) hits.push({ row, score });
  }
  const val = (get: (r: CoinSearchLite) => number | undefined, dir: 1 | -1) => (a: { row: CoinSearchLite; score: number }, b: { row: CoinSearchLite; score: number }) => {
    const va = get(a.row); const vb = get(b.row);
    if (va === undefined && vb === undefined) return b.score - a.score || b.row.created - a.row.created;
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    return (va - vb) * dir || b.score - a.score;
  };
  const cmp = {
    relevance: (a: { row: CoinSearchLite; score: number }, b: { row: CoinSearchLite; score: number }) => b.score - a.score || b.row.created - a.row.created,
    newest: (a: { row: CoinSearchLite; score: number }, b: { row: CoinSearchLite; score: number }) => b.row.created - a.row.created || b.score - a.score,
    'price-asc': val((r) => r.price, 1),
    'price-desc': val((r) => r.price, -1),
    'ppo-asc': val(perOz, 1),
    'premium-asc': val((r) => premium(r, spot), 1),
  }[f.sort] || ((a: { score: number }, b: { score: number }) => b.score - a.score);
  hits.sort(cmp);
  return { rows: hits.slice(0, limit).map((h) => h.row), total: hits.length };
}

/** "See all results" link: /coins/browse with the same query, type, metal, price and sort. */
export function coinInlineBrowseHref(query: string, f: CoinInlineFilters): string {
  const cf: CoinFilters = {};
  const q = query.trim();
  if (q) cf.q = q;
  if (f.type !== 'all') cf.coinType = f.type;
  if (f.metal) cf.metals = [f.metal];
  const b = f.price ? PRICE_BUCKETS.find((x) => x.id === f.price) : undefined;
  if (b?.min !== undefined) cf.priceMin = b.min;
  if (b?.max !== undefined) cf.priceMax = b.max;
  if (f.sort !== 'relevance') cf.sort = f.sort;
  const qs = coinFiltersToParams(cf).toString();
  return qs ? `/coins/browse?${qs}` : '/coins/browse';
}

export function coinInlineCacheKey(query: string, f: CoinInlineFilters): string {
  return ['coins', tokenize(query).join(' '), f.type, f.metal || '', f.price || '', f.sort].join('|');
}

/** Metals present in the index (for the dropdown's metal select). */
export function coinIndexMetals(index: CoinSearchLite[]): CoinMetal[] {
  const order: CoinMetal[] = ['gold', 'silver', 'platinum', 'palladium', 'base'];
  const present = new Set(index.map((r) => r.metal).filter(Boolean));
  return order.filter((m) => present.has(m));
}
