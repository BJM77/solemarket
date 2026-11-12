'use client';

/**
 * Client store for the Previous/Next listing sequence: one sequence per browsing session
 * (sessionStorage), shared by the mobile bottom nav and the desktop listing header.
 */
import { useEffect, useState } from 'react';
import type { Product } from '@/lib/types';
import { getProductUrl } from '@/lib/utils/url';
import { type ListingNavEntry, collectListingLinks, listingIdFromPath } from './index';
import {
  type SequenceSource, type SequenceState, type SequenceNeighbours,
  createSequence, directSequence, extendSequence, indexOf, isExhausted, isSequenceState, neighboursIn,
} from './sequence';

export const LISTING_SEQUENCE_KEY = 'benched_listing_seq';
const PAGE_SIZE = 24;

let state: SequenceState | null = null;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(): SequenceState | null {
  if (typeof window === 'undefined') return null; // never share sequence state across server renders
  if (loaded) return state;
  loaded = true;
  try {
    const raw = sessionStorage.getItem(LISTING_SEQUENCE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    state = isSequenceState(parsed) ? parsed : null;
  } catch { state = null; }
  return state;
}

function save(next: SequenceState | null) {
  state = next;
  loaded = true;
  try {
    if (next) sessionStorage.setItem(LISTING_SEQUENCE_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(LISTING_SEQUENCE_KEY);
  } catch { /* storage blocked: keep it in memory */ }
  listeners.forEach((l) => l());
}

export function startSequence(opts: Parameters<typeof createSequence>[0]) {
  inflight = null;
  save(createSequence(opts));
}

export function clearSequence() {
  inflight = null;
  save(null);
}

function toEntry(p: Product): ListingNavEntry | null {
  if (!p?.id || (p as any).isDraft) return null;
  return { id: p.id, url: getProductUrl({ id: p.id, title: p.title || '', category: p.category }), image: p.imageUrls?.[0] || undefined };
}

/** Fetch one page of a source with the same rules as the browse grid (viewer: available only). */
async function fetchPage(source: SequenceSource, cursor: string | undefined) {
  const params: any = { ...source.params, lastId: cursor, limit: PAGE_SIZE, page: 2 /* skip the count query */ };
  const res: { products?: Product[]; hasMore?: boolean; lastVisibleId?: string } = source.provider === 'external'
    ? await (await import('@/app/actions/search/search')).searchProductsAction(params)
    : await (await import('@/services/product-service')).getProducts(params, 'viewer');
  const entries = (res.products || []).map(toEntry).filter(Boolean) as ListingNavEntry[];
  return { entries, nextCursor: res.hasMore ? res.lastVisibleId : undefined };
}

/** Make sure the listing after `id` is known (fetching more of the sequence if needed). */
function ensureNext(id: string) {
  const s = load();
  if (!s || inflight) return;
  const i = indexOf(s, id);
  if (i < 0 || s.trail[i + 1] || isExhausted(s)) return;
  const started = s;
  inflight = extendSequence(s, fetchPage, { want: 1 })
    .then((next) => { if (state === started) save(next); })
    .catch((e) => { console.warn('[listing-nav] could not load the next listing', e); })
    .finally(() => {
      inflight = null;
      // A new sequence started meanwhile: let the listing page ask again for its own next.
      if (state !== started) listeners.forEach((l) => l());
    });
}

export interface ListingSequenceView {
  prev: ListingNavEntry | null;
  next: ListingNavEntry | null;
  done: boolean;
  loading: boolean;
  returnHref: string;
}

/** Previous/Next for the listing at `pathname` (`id` = its listing id). */
export function useListingSequence(id: string | null, pathname: string | null): ListingSequenceView | null {
  const [, force] = useState(0);
  // sessionStorage only exists in the browser: render the server/hydration pass as "loading".
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!id || !mounted) return;
    const s = load();
    // Not part of the current sequence (opened directly, shared link...): start from here.
    if (!s || indexOf(s, id) < 0) save(directSequence({ id, url: pathname || `/product/${id}` }, s?.returnHref || '/browse'));
    ensureNext(id);
  });

  if (!id) return null;
  const s = mounted ? load() : null;
  const n: SequenceNeighbours | null = s ? neighboursIn(s, id) : null;
  if (!s || !n) return { prev: null, next: null, done: false, loading: true, returnHref: '/browse' };
  return { ...n, loading: !n.next && !n.done, returnHref: s.returnHref || '/browse' };
}

/** Context a browse grid publishes on its root element (`data-listing-ctx`). */
export interface GridListingContext {
  params: Record<string, any>;
  provider?: 'firestore' | 'external';
  /** Where the grid's query left off; null when the grid already shows every match. */
  cursor: string | null;
}

/**
 * When a listing tile is tapped, start a sequence from the list it came from:
 *  - a browse grid (`[data-listing-ctx]`): its loaded tiles, then the rest of its filtered query, then everything else;
 *  - any other list (nearest ancestor with 2+ listing links, e.g. a home-page rail): those tiles, then everything else;
 *  - a lone link: no context, the listing page starts a default sequence.
 * Taps on the Prev/Next controls themselves (`[data-listing-nav]`) keep the current sequence.
 */
export function captureListingClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a) return;
  let path: string;
  try { path = new URL(a.href, window.location.origin).pathname; } catch { return; }
  if (!listingIdFromPath(path)) return;
  if (a.closest('[data-listing-nav]')) return;

  const onListingPage = !!listingIdFromPath(window.location.pathname);
  const returnHref = onListingPage ? (load()?.returnHref || '/browse') : `${window.location.pathname}${window.location.search}`;

  const gridEl = a.closest('[data-listing-ctx]') as HTMLElement | null;
  if (gridEl) {
    let ctx: GridListingContext | null = null;
    try { ctx = JSON.parse(gridEl.dataset.listingCtx || 'null'); } catch { ctx = null; }
    if (ctx && typeof ctx.params === 'object') {
      startSequence({ trail: collectListingLinks(gridEl), filter: ctx.params, provider: ctx.provider, cursor: ctx.cursor, returnHref });
      return;
    }
  }
  let node: HTMLElement | null = a.parentElement;
  while (node && node !== document.body) {
    const links = collectListingLinks(node);
    if (links.length >= 2) { startSequence({ trail: links, returnHref }); return; }
    node = node.parentElement;
  }
  clearSequence();
}
