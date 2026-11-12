/**
 * Pure Previous/Next sequencing for listing pages.
 *
 * A sequence is a trail of listings in the order a buyer will step through them:
 *   1. the listings they were browsing (the grid they tapped, same order), then
 *   2. every other listing matching that grid's filters (paging the same query), then
 *   3. the rest of that category, then every remaining listing on the site (newest first),
 * never repeating a listing. Previous walks back along the trail.
 */
import type { ListingNavEntry } from './index';

/** One query to page through. `provider: 'external'` = the browse grid's search adapter. */
export interface SequenceSource {
  params: Record<string, any>;
  provider?: 'firestore' | 'external';
}

export interface SequenceState {
  v: 1;
  /** Listings in step order; ids are unique. */
  trail: ListingNavEntry[];
  /** Queries still to page through, in order (filtered first, then the remainder). */
  sources: SequenceSource[];
  /** Index into `sources` currently being paged; `>= sources.length` once everything is exhausted. */
  phase: number;
  /** Paging cursor for `sources[phase]` (undefined = start from the top). */
  cursor?: string;
  /** Where "Back to browse" should go. */
  returnHref?: string;
}

export type PageFetcher = (source: SequenceSource, cursor: string | undefined) => Promise<{ entries: ListingNavEntry[]; nextCursor?: string }>;

/** Keys that describe paging/presentation, not which listings match. */
const NON_FILTER_KEYS = new Set(['lastId', 'page', 'limit', 'view', 'countOnly', 'status']);

export function cleanFilterParams(params: Record<string, any> | null | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (NON_FILTER_KEYS.has(k) || v === undefined || v === null || v === '') continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

const POKEMON_RE = /pok[eé]mon/i;
const COIN_RE = /coin|bullion/i;

/**
 * The "everything else" query once a filtered grid is exhausted. Main-site grids fall back to the
 * main-site feed (newest first; Pokémon and coins stay hidden by the feed itself). A Pokémon or coin
 * grid stays inside its own section.
 */
export function remainderParams(filter: Record<string, any> = {}): Record<string, any> {
  const base: Record<string, any> = { sort: 'createdAt-desc' };
  const sub = String(filter.subCategory || '');
  const brand = String(filter.brand || '');
  const cat = String(filter.category || '');
  if (POKEMON_RE.test(sub) || POKEMON_RE.test(brand)) {
    if (filter.category) base.category = filter.category;
    base.subCategory = filter.subCategory || filter.brand;
  } else if (COIN_RE.test(cat)) {
    base.category = filter.category;
  }
  return base;
}

function sameSource(a: SequenceSource, b: SequenceSource): boolean {
  const norm = (s: SequenceSource) => JSON.stringify({ p: s.provider || 'firestore', q: Object.keys(s.params).sort().map((k) => [k, s.params[k]]) });
  return norm(a) === norm(b);
}

function uniqueEntries(entries: ListingNavEntry[]): ListingNavEntry[] {
  const seen = new Set<string>();
  return entries.filter((e) => e && e.id && !seen.has(e.id) && (seen.add(e.id), true));
}

/**
 * Build a sequence. `trail` is what the buyer could already see (the grid they tapped, in order),
 * `filter` the grid's filters (omit for plain lists, e.g. home-page rails), `cursor` where the grid's
 * query left off (null = the grid already holds every match).
 */
export function createSequence(opts: {
  trail: ListingNavEntry[];
  filter?: Record<string, any> | null;
  provider?: 'firestore' | 'external';
  cursor?: string | null;
  returnHref?: string;
}): SequenceState {
  const trail = uniqueEntries(opts.trail);
  const sources: SequenceSource[] = [];
  let phase = 0;
  let cursor: string | undefined;
  const remainder: SequenceSource = { params: remainderParams(opts.filter ? cleanFilterParams(opts.filter) : {}), provider: 'firestore' };
  if (opts.filter) {
    const filtered: SequenceSource = { params: cleanFilterParams(opts.filter), provider: opts.provider || 'firestore' };
    if (!filtered.params.sort) filtered.params.sort = 'createdAt-desc';
    sources.push(filtered);
    if (opts.cursor === null) phase = 1; // the grid already showed every match
    else cursor = opts.cursor || undefined;
    // Then the rest of the same category (e.g. more sneakers), then everything else.
    const sameCategory: SequenceSource = { params: { ...remainder.params, category: filtered.params.category }, provider: 'firestore' };
    if (filtered.params.category && !remainder.params.category && !sameSource(filtered, sameCategory)) sources.push(sameCategory);
    // A grid that is already the default feed has no separate remainder.
    if (!sameSource(filtered, remainder)) sources.push(remainder);
  } else {
    sources.push(remainder);
  }
  return { v: 1, trail, sources, phase, cursor, returnHref: opts.returnHref };
}

/** A listing opened with no browse context: just the current listing, then the default feed. */
export function directSequence(current: ListingNavEntry, returnHref = '/browse'): SequenceState {
  return createSequence({ trail: [current], returnHref });
}

export function isExhausted(state: SequenceState): boolean {
  return state.phase >= state.sources.length;
}

export function indexOf(state: SequenceState, id: string): number {
  return state.trail.findIndex((e) => e.id === id);
}

export interface SequenceNeighbours {
  prev: ListingNavEntry | null;
  next: ListingNavEntry | null;
  /** True when there is no next listing and nothing is left to page through. */
  done: boolean;
}

export function neighboursIn(state: SequenceState, id: string): SequenceNeighbours | null {
  const i = indexOf(state, id);
  if (i < 0) return null;
  const next = state.trail[i + 1] ?? null;
  return { prev: state.trail[i - 1] ?? null, next, done: !next && isExhausted(state) };
}

/**
 * Page through the remaining queries until at least `want` new listings have been appended
 * (or everything is exhausted / `maxPages` fetched). Never appends a listing already in the trail.
 * Pages that come back empty (in-memory filters dropped every doc) are skipped, not treated as the end.
 */
export async function extendSequence(state: SequenceState, fetchPage: PageFetcher, opts: { want?: number; maxPages?: number } = {}): Promise<SequenceState> {
  const want = Math.max(1, opts.want ?? 1);
  const maxPages = Math.max(1, opts.maxPages ?? 40);
  const trail = [...state.trail];
  const seen = new Set(trail.map((e) => e.id));
  let { phase, cursor } = state;
  let added = 0;
  let pages = 0;
  while (phase < state.sources.length && added < want && pages < maxPages) {
    pages += 1;
    const { entries, nextCursor } = await fetchPage(state.sources[phase], cursor);
    for (const e of entries || []) {
      if (!e?.id || seen.has(e.id)) continue;
      seen.add(e.id);
      trail.push(e);
      added += 1;
    }
    // Guard against a cursor that doesn't move (would loop forever).
    if (nextCursor && nextCursor !== cursor) cursor = nextCursor;
    else { phase += 1; cursor = undefined; }
  }
  return { ...state, trail, phase, cursor };
}

export function isSequenceState(x: any): x is SequenceState {
  return !!x && x.v === 1 && Array.isArray(x.trail) && Array.isArray(x.sources) && typeof x.phase === 'number'
    && x.trail.every((e: any) => e && typeof e.id === 'string' && typeof e.url === 'string');
}
