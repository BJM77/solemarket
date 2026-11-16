/**
 * Benched Coins search filters and sorts (header search dropdown and
 * /coins/browse). Pure, so the rules are unit tested and shared by the
 * server page, the client grid and getProducts.
 *
 * The coins catalog is small, so everything is matched in memory: no new
 * Firestore indexes are needed.
 */
import { COIN_SUBCATEGORIES } from '@/lib/coin-listings';
import { coinFacets, type CoinFacets, type CoinListingLike, type CoinMetal, METAL_LABELS, PRECIOUS_METALS } from './facets';

export type CoinTypeFilter = 'coins' | 'bullion' | 'banknotes';
export type WeightBucket = 'u1' | '1' | '1-10' | '10+';
export type GradedFilter = 'graded' | 'raw';
export type CoinSort = 'newest' | 'price-asc' | 'price-desc' | 'ppo-asc' | 'premium-asc' | 'year-asc' | 'year-desc';

/** AUD per troy ounce by metal (from the spot price helper). */
export type SpotMap = Partial<Record<Exclude<CoinMetal, 'base'>, number>>;

export interface CoinFilters {
  q?: string;
  coinType?: CoinTypeFilter;
  subCategory?: string;
  metals?: CoinMetal[];
  weight?: WeightBucket;
  /** Minimum fineness as a fraction (0.999 = .999 and above). */
  purityMin?: number;
  yearMin?: number;
  yearMax?: number;
  country?: string;
  mint?: string;
  denomination?: string;
  conditions?: string[];
  graded?: GradedFilter;
  grader?: string;
  /** Minimum numeric grade (MS65 -> 65). */
  gradeMin?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: CoinSort;
}

export const COIN_TYPE_OPTIONS: { value: CoinTypeFilter; label: string }[] = [
  { value: 'coins', label: 'Coins' },
  { value: 'bullion', label: 'Bullion' },
  { value: 'banknotes', label: 'Banknotes' },
];

export const WEIGHT_OPTIONS: { value: WeightBucket; label: string }[] = [
  { value: 'u1', label: 'Under 1 oz' },
  { value: '1', label: '1 oz' },
  { value: '1-10', label: 'Over 1 oz, under 10 oz' },
  { value: '10+', label: '10 oz and over (incl. 1 kg)' },
];

export const PURITY_OPTIONS: { value: number; label: string }[] = [
  { value: 0.9999, label: '.9999 and above' },
  { value: 0.999, label: '.999 and above' },
  { value: 0.925, label: '.925 (sterling) and above' },
  { value: 0.9, label: '.900 and above' },
];

export const GRADE_MIN_OPTIONS = [70, 69, 67, 65, 63, 60, 50, 40] as const;

export const PRICE_BUCKETS: { id: string; label: string; min?: number; max?: number }[] = [
  { id: 'u50', label: 'Under $50', max: 50 },
  { id: '50-200', label: '$50–$200', min: 50, max: 200 },
  { id: '200-1000', label: '$200–$1,000', min: 200, max: 1000 },
  { id: '1000+', label: '$1,000+', min: 1000 },
];

export interface CoinSortOption { value: CoinSort; label: string; needsSpot?: boolean; needsWeight?: boolean }

export const COIN_SORT_OPTIONS: CoinSortOption[] = [
  { value: 'newest', label: 'Newest listed' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'ppo-asc', label: 'Price per oz: low to high', needsWeight: true },
  { value: 'premium-asc', label: 'Lowest premium over spot', needsSpot: true },
  { value: 'year-asc', label: 'Year: oldest first' },
  { value: 'year-desc', label: 'Year: newest first' },
];

const SORTS = new Set<CoinSort>(COIN_SORT_OPTIONS.map((o) => o.value));
const METALS = new Set<CoinMetal>(['gold', 'silver', 'platinum', 'palladium', 'base']);
const WEIGHTS = new Set<WeightBucket>(WEIGHT_OPTIONS.map((o) => o.value));

type ParamSource = URLSearchParams | Record<string, unknown>;

function getter(src: ParamSource): (k: string) => string {
  if (typeof (src as URLSearchParams).get === 'function') {
    return (k) => ((src as URLSearchParams).get(k) || '').trim();
  }
  return (k) => {
    const v = (src as Record<string, unknown>)[k];
    const s = Array.isArray(v) ? (v.every((x) => typeof x === 'string') ? v.join(',') : v[0]) : v;
    if (typeof s === 'number' && Number.isFinite(s)) return String(s);
    return typeof s === 'string' ? s.trim() : '';
  };
}

const numOrUndef = (s: string, min = -Infinity, max = Infinity): number | undefined => {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
};
const list = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
const clean = (s: string, max = 80): string | undefined => (s ? s.slice(0, max) : undefined);

/** URL query -> filters. Unknown or out-of-range values are ignored. */
export function parseCoinFilters(src: ParamSource): CoinFilters {
  const g = getter(src);
  const f: CoinFilters = {};
  const q = clean(g('q'), 120); if (q) f.q = q;
  const t = g('coinType'); if (t === 'coins' || t === 'bullion' || t === 'banknotes') f.coinType = t;
  const sub = g('subCategory'); if ((COIN_SUBCATEGORIES as readonly string[]).includes(sub)) f.subCategory = sub;
  const metals = list(g('metal').toLowerCase()).filter((m): m is CoinMetal => METALS.has(m as CoinMetal)); if (metals.length) f.metals = [...new Set(metals)];
  const w = g('weight') as WeightBucket; if (WEIGHTS.has(w)) f.weight = w;
  const pur = numOrUndef(g('purity'), 0.1, 1); if (pur !== undefined) f.purityMin = pur;
  const max = new Date().getFullYear() + 1;
  const y1 = numOrUndef(g('yearMin'), 1, max); if (y1 !== undefined) f.yearMin = Math.floor(y1);
  const y2 = numOrUndef(g('yearMax'), 1, max); if (y2 !== undefined) f.yearMax = Math.floor(y2);
  const c = clean(g('country')); if (c) f.country = c;
  const m = clean(g('mint')); if (m) f.mint = m;
  const d = clean(g('denomination'), 30); if (d) f.denomination = d;
  const cond = list(g('condition')).slice(0, 10); if (cond.length) f.conditions = cond;
  const gr = g('graded'); if (gr === 'graded' || gr === 'raw') f.graded = gr;
  const grader = clean(g('grader'), 20); if (grader) f.grader = grader;
  const gm = numOrUndef(g('gradeMin'), 1, 70); if (gm !== undefined) f.gradeMin = Math.floor(gm);
  const p1 = numOrUndef(g('priceMin'), 0, 1e7); if (p1 !== undefined) f.priceMin = p1;
  const p2 = numOrUndef(g('priceMax'), 0, 1e7); if (p2 !== undefined) f.priceMax = p2;
  const s = g('sort') as CoinSort; if (SORTS.has(s) && s !== 'newest') f.sort = s;
  return f;
}

/** Filters -> URL query (stable key order; defaults left out). */
export function coinFiltersToParams(f: CoinFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.coinType) p.set('coinType', f.coinType);
  if (f.subCategory) p.set('subCategory', f.subCategory);
  if (f.metals?.length) p.set('metal', f.metals.join(','));
  if (f.weight) p.set('weight', f.weight);
  if (f.purityMin !== undefined) p.set('purity', String(f.purityMin));
  if (f.yearMin !== undefined) p.set('yearMin', String(f.yearMin));
  if (f.yearMax !== undefined) p.set('yearMax', String(f.yearMax));
  if (f.country) p.set('country', f.country);
  if (f.mint) p.set('mint', f.mint);
  if (f.denomination) p.set('denomination', f.denomination);
  if (f.conditions?.length) p.set('condition', f.conditions.join(','));
  if (f.graded) p.set('graded', f.graded);
  if (f.grader) p.set('grader', f.grader);
  if (f.gradeMin !== undefined) p.set('gradeMin', String(f.gradeMin));
  if (f.priceMin !== undefined) p.set('priceMin', String(f.priceMin));
  if (f.priceMax !== undefined) p.set('priceMax', String(f.priceMax));
  if (f.sort && f.sort !== 'newest') p.set('sort', f.sort);
  return p;
}

export function coinsBrowseHref(f: CoinFilters): string {
  const qs = coinFiltersToParams(f).toString();
  return qs ? `/coins/browse?${qs}` : '/coins/browse';
}

/** Number of filters the buyer chose (sort, search text and type pills not counted). */
export function activeCoinFilterCount(f: CoinFilters): number {
  return [
    f.metals?.length, f.weight, f.purityMin !== undefined, f.yearMin !== undefined || f.yearMax !== undefined, f.country, f.mint,
    f.denomination, f.conditions?.length, f.graded, f.grader, f.gradeMin !== undefined, f.priceMin !== undefined || f.priceMax !== undefined,
  ].filter(Boolean).length;
}

const eq = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

function inWeightBucket(oz: number | undefined, b: WeightBucket): boolean {
  if (!oz) return false;
  const one = Math.abs(oz - 1) <= 0.03; // 1 oz (31.1 g) give or take rounding
  if (b === '1') return one;
  if (b === 'u1') return oz < 1 && !one;
  if (b === '1-10') return oz > 1 && !one && oz < 9.97;
  return oz >= 9.97;
}

const SEARCH_FIELDS = ['title', 'description', 'brand', 'mint', 'subCategory', 'denomination', 'metal', 'country', 'year', 'model', 'gradingCompany', 'grade', 'weight', 'purity', 'condition'];

function textOf(p: CoinListingLike): string {
  return SEARCH_FIELDS.map((k) => p[k]).filter((v) => typeof v === 'string' || typeof v === 'number').join(' ').toLowerCase();
}

/** True when a listing passes every chosen filter. Missing facts never match a filter on that fact. */
export function matchesCoinFilters(p: CoinListingLike, f: CoinFilters, facets: CoinFacets = coinFacets(p)): boolean {
  if (f.q) {
    const hay = textOf(p);
    const terms = f.q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.every((t) => hay.includes(t) || hay.includes(t.replace(/^\$+/, '$')))) return false;
  }
  if (f.coinType === 'bullion' && facets.kind !== 'bullion') return false;
  if (f.coinType === 'coins' && facets.kind !== 'coin') return false;
  if (f.coinType === 'banknotes' && facets.kind !== 'banknote') return false;
  if (f.subCategory && !eq(String(p.subCategory || ''), f.subCategory)) return false;
  if (f.metals?.length && (!facets.metal || !f.metals.includes(facets.metal))) return false;
  if (f.weight && !inWeightBucket(facets.weightOz, f.weight)) return false;
  if (f.purityMin !== undefined && !(facets.purity !== undefined && facets.purity + 1e-9 >= f.purityMin)) return false;
  if (f.yearMin !== undefined && !(facets.year !== undefined && facets.year >= f.yearMin)) return false;
  if (f.yearMax !== undefined && !(facets.year !== undefined && facets.year <= f.yearMax)) return false;
  if (f.country && !eq(facets.country, f.country)) return false;
  if (f.mint && !eq(facets.mint, f.mint)) return false;
  if (f.denomination && !eq(facets.denomination, f.denomination)) return false;
  if (f.conditions?.length && !f.conditions.some((c) => eq(facets.condition, c))) return false;
  if (f.graded === 'graded' && !facets.graded) return false;
  if (f.graded === 'raw' && facets.graded) return false;
  if (f.grader && !eq(facets.gradingCompany, f.grader)) return false;
  if (f.gradeMin !== undefined && !(facets.gradeNumber !== undefined && facets.gradeNumber >= f.gradeMin)) return false;
  if (f.priceMin !== undefined && facets.price < f.priceMin) return false;
  if (f.priceMax !== undefined && facets.price > f.priceMax) return false;
  return true;
}

/** AUD per fine troy ounce, when weight, purity and a precious metal are known. */
export function pricePerFineOz(facets: CoinFacets): number | undefined {
  if (!facets.fineOz || !(facets.price > 0)) return undefined;
  return facets.price / facets.fineOz;
}

/** Melt value in AUD at spot, when weight, purity, metal and that metal's spot price are known. */
export function meltValue(facets: CoinFacets, spot: SpotMap | null | undefined): number | undefined {
  if (!spot || !facets.fineOz || !facets.metal || facets.metal === 'base') return undefined;
  const s = spot[facets.metal];
  return s && s > 0 ? facets.fineOz * s : undefined;
}

/** Premium over spot as a fraction (0.08 = 8% over melt). */
export function premiumOverSpot(facets: CoinFacets, spot: SpotMap | null | undefined): number | undefined {
  const melt = meltValue(facets, spot);
  if (!melt || !(facets.price > 0)) return undefined;
  return facets.price / melt - 1;
}

export function hasSpot(spot: SpotMap | null | undefined): spot is SpotMap {
  return !!spot && PRECIOUS_METALS.some((m) => m !== 'base' && (spot as any)[m] > 0);
}

/** Sort options to offer: premium needs live spot prices, price per oz needs a listing with a known fine weight. */
export function availableCoinSorts(opts: { spot?: SpotMap | null; anyFineWeight?: boolean }): CoinSortOption[] {
  return COIN_SORT_OPTIONS.filter((o) => (!o.needsSpot || (hasSpot(opts.spot) && opts.anyFineWeight)) && (!o.needsWeight || opts.anyFineWeight));
}

/** The sort to actually use: falls back to newest when the asked-for sort isn't available. */
export function effectiveCoinSort(sort: CoinSort | undefined, opts: { spot?: SpotMap | null; anyFineWeight?: boolean }): CoinSort {
  if (!sort) return 'newest';
  return availableCoinSorts(opts).some((o) => o.value === sort) ? sort : 'newest';
}

type Ranked<T> = { item: T; facets: CoinFacets };

/**
 * Sort listings. Listings missing the value a sort needs (no fine weight for
 * price per oz, no spot for premium, no year) go after the rest, newest first.
 */
export function sortCoinListings<T extends CoinListingLike>(items: T[], sort: CoinSort = 'newest', spot?: SpotMap | null, facetsOf: (p: T) => CoinFacets = coinFacets): T[] {
  const ranked: Ranked<T>[] = items.map((item) => ({ item, facets: facetsOf(item) }));
  const newest = (a: Ranked<T>, b: Ranked<T>) => b.facets.createdMs - a.facets.createdMs;
  const byValue = (get: (f: CoinFacets) => number | undefined, dir: 1 | -1) => (a: Ranked<T>, b: Ranked<T>) => {
    const va = get(a.facets); const vb = get(b.facets);
    if (va === undefined && vb === undefined) return newest(a, b);
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    return (va - vb) * dir || newest(a, b);
  };
  const cmp: Record<CoinSort, (a: Ranked<T>, b: Ranked<T>) => number> = {
    newest,
    'price-asc': byValue((f) => (f.price > 0 ? f.price : undefined), 1),
    'price-desc': byValue((f) => (f.price > 0 ? f.price : undefined), -1),
    'ppo-asc': byValue(pricePerFineOz, 1),
    'premium-asc': byValue((f) => premiumOverSpot(f, spot), 1),
    'year-asc': byValue((f) => f.year, 1),
    'year-desc': byValue((f) => f.year, -1),
  };
  return ranked.sort(cmp[sort] || newest).map((r) => r.item);
}

/** Filter + sort in one go (facts are worked out once per listing). */
export function applyCoinFilters<T extends CoinListingLike>(items: T[], f: CoinFilters, spot?: SpotMap | null): T[] {
  const cache = new Map<T, CoinFacets>();
  const facetsOf = (p: T) => { let v = cache.get(p); if (!v) { v = coinFacets(p); cache.set(p, v); } return v; };
  const anyFineWeight = items.some((p) => facetsOf(p).fineOz !== undefined);
  const matched = items.filter((p) => matchesCoinFilters(p, f, facetsOf(p)));
  return sortCoinListings(matched, effectiveCoinSort(f.sort, { spot, anyFineWeight }), spot, facetsOf);
}

export interface FacetOption { value: string; label: string; count: number }

export interface CoinFacetOptions {
  metals: FacetOption[];
  countries: FacetOption[];
  mints: FacetOption[];
  denominations: FacetOption[];
  conditions: FacetOption[];
  graders: FacetOption[];
  years: { min?: number; max?: number };
  anyGraded: boolean;
  anyWeight: boolean;
  anyPurity: boolean;
  anyFineWeight: boolean;
}

function tally(values: (string | undefined)[], labelOf: (v: string) => string = (v) => v): FacetOption[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const v of values) {
    if (!v) continue;
    const key = v.trim().toLowerCase();
    const hit = map.get(key);
    if (hit) hit.count += 1; else map.set(key, { label: labelOf(v.trim()), count: 1 });
  }
  return [...map.entries()].map(([, { label, count }]) => ({ value: label, label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Filter choices built from the listings themselves, so every option has at least one match. */
export function coinFacetOptions(items: CoinListingLike[]): CoinFacetOptions {
  const all = items.map((p) => coinFacets(p));
  const years = all.map((f) => f.year).filter((y): y is number => y !== undefined);
  const metalOrder: CoinMetal[] = ['gold', 'silver', 'platinum', 'palladium', 'base'];
  const metalCounts = new Map<CoinMetal, number>();
  for (const f of all) if (f.metal) metalCounts.set(f.metal, (metalCounts.get(f.metal) || 0) + 1);
  return {
    metals: metalOrder.filter((m) => metalCounts.has(m)).map((m) => ({ value: m, label: METAL_LABELS[m], count: metalCounts.get(m)! })),
    countries: tally(all.map((f) => f.country)),
    mints: tally(all.map((f) => f.mint)),
    denominations: tally(all.map((f) => f.denomination)),
    conditions: tally(all.map((f) => f.condition)),
    graders: tally(all.map((f) => f.gradingCompany)),
    years: years.length ? { min: Math.min(...years), max: Math.max(...years) } : {},
    anyGraded: all.some((f) => f.graded),
    anyWeight: all.some((f) => f.weightOz !== undefined),
    anyPurity: all.some((f) => f.purity !== undefined),
    anyFineWeight: all.some((f) => f.fineOz !== undefined),
  };
}

export interface CoinFilterChip { key: keyof CoinFilters; value?: string; label: string }

/** Removable "active filter" chips, in plain words. */
export function coinFilterChips(f: CoinFilters): CoinFilterChip[] {
  const chips: CoinFilterChip[] = [];
  for (const m of f.metals || []) chips.push({ key: 'metals', value: m, label: METAL_LABELS[m] });
  if (f.weight) chips.push({ key: 'weight', label: WEIGHT_OPTIONS.find((o) => o.value === f.weight)?.label || f.weight });
  if (f.purityMin !== undefined) chips.push({ key: 'purityMin', label: `Purity ${PURITY_OPTIONS.find((o) => o.value === f.purityMin)?.label || `${f.purityMin}+`}` });
  if (f.yearMin !== undefined || f.yearMax !== undefined) {
    const label = f.yearMin !== undefined && f.yearMax !== undefined ? (f.yearMin === f.yearMax ? `Year ${f.yearMin}` : `${f.yearMin}–${f.yearMax}`) : f.yearMin !== undefined ? `${f.yearMin} or later` : `${f.yearMax} or earlier`;
    chips.push({ key: 'yearMin', label });
  }
  if (f.country) chips.push({ key: 'country', label: f.country });
  if (f.mint) chips.push({ key: 'mint', label: f.mint });
  if (f.denomination) chips.push({ key: 'denomination', label: f.denomination });
  for (const c of f.conditions || []) chips.push({ key: 'conditions', value: c, label: c });
  if (f.graded) chips.push({ key: 'graded', label: f.graded === 'graded' ? 'Graded' : 'Raw (not graded)' });
  if (f.grader) chips.push({ key: 'grader', label: f.grader });
  if (f.gradeMin !== undefined) chips.push({ key: 'gradeMin', label: `Grade ${f.gradeMin}+` });
  if (f.priceMin !== undefined || f.priceMax !== undefined) {
    const fmt = (n: number) => `$${n.toLocaleString('en-AU')}`;
    chips.push({ key: 'priceMin', label: f.priceMin !== undefined && f.priceMax !== undefined ? `${fmt(f.priceMin)}–${fmt(f.priceMax)}` : f.priceMin !== undefined ? `${fmt(f.priceMin)}+` : `Under ${fmt(f.priceMax!)}` });
  }
  return chips;
}

/** Filters with one chip removed. */
export function removeCoinChip(f: CoinFilters, chip: CoinFilterChip): CoinFilters {
  const next: CoinFilters = { ...f };
  if (chip.key === 'metals') next.metals = (f.metals || []).filter((m) => m !== chip.value);
  else if (chip.key === 'conditions') next.conditions = (f.conditions || []).filter((c) => c !== chip.value);
  else if (chip.key === 'yearMin') { delete next.yearMin; delete next.yearMax; }
  else if (chip.key === 'priceMin') { delete next.priceMin; delete next.priceMax; }
  else delete next[chip.key];
  if (next.metals && !next.metals.length) delete next.metals;
  if (next.conditions && !next.conditions.length) delete next.conditions;
  return next;
}

/** Page heading for the current filters. */
export function coinsBrowseHeading(f: Pick<CoinFilters, 'q' | 'coinType' | 'subCategory'>): string {
  if (f.q) return `Results for "${f.q}"`;
  if (f.subCategory) return f.subCategory;
  if (f.coinType === 'bullion') return 'Bullion';
  if (f.coinType === 'coins') return 'Coins';
  if (f.coinType === 'banknotes') return 'Banknotes';
  return 'All coins & bullion';
}

/** Spot quotes -> { gold: audPerOz, ... }. */
export function spotMapFrom(prices: { quotes: { metal: string; audPerOz: number }[] } | null | undefined): SpotMap | null {
  if (!prices?.quotes?.length) return null;
  const out: SpotMap = {};
  for (const q of prices.quotes) if (PRECIOUS_METALS.includes(q.metal as CoinMetal) && q.audPerOz > 0) (out as any)[q.metal] = q.audPerOz;
  return hasSpot(out) ? out : null;
}
