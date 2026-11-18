'use client';

import type { SearchLite } from '@/lib/search/inline';
import type { CoinSearchLite } from '@/lib/coins/search-lite';
import type { SpotMap } from '@/lib/coins/filters';

/**
 * Browser-side loaders for the lite search indexes (/api/search/lite, and
 * /api/search/lite?storefront=coins for Benched Coins).
 * One shared in-flight request each, kept in memory and sessionStorage so later pages answer instantly.
 */
const SS_TTL_MS = 5 * 60 * 1000;

/** Last measured main index download time (ms), for diagnostics. */
export let lastIndexLoadMs: number | null = null;

interface Loaded<R, M> { rows: R[] | null; version: number; meta: M | null }

function createIndexLoader<R, M = undefined>(url: string, ssKey: string, pickMeta: (body: any) => M, onLoaded?: (ms: number) => void) {
  let data: R[] | null = null;
  let meta: M | null = null;
  let version = 0;
  let inflight: Promise<R[]> | null = null;

  const getLoaded = (): Loaded<R, M> => {
    if (!data) {
      try {
        const raw = sessionStorage.getItem(ssKey);
        if (raw) {
          const parsed = JSON.parse(raw) as { at: number; rows: R[]; meta?: M };
          if (Array.isArray(parsed.rows) && Date.now() - parsed.at < SS_TTL_MS) { data = parsed.rows; meta = parsed.meta ?? null; version++; }
        }
      } catch { /* ignore */ }
    }
    return { rows: data, version, meta };
  };

  const load = (): Promise<R[]> => {
    const cached = getLoaded().rows;
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    inflight = fetch(url, { headers: { accept: 'application/json' } })
      .then((r) => {
        if (!r.ok) throw new Error(`search index ${r.status}`);
        return r.json() as Promise<{ rows: R[] }>;
      })
      .then((body) => {
        data = Array.isArray(body.rows) ? body.rows : [];
        meta = pickMeta(body);
        version++;
        onLoaded?.(Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0));
        try { sessionStorage.setItem(ssKey, JSON.stringify({ at: Date.now(), rows: data, meta })); } catch { /* quota */ }
        return data;
      })
      .finally(() => { inflight = null; });
    return inflight;
  };

  return { getLoaded, load };
}

const main = createIndexLoader<SearchLite>('/api/search/lite', 'benched_search_lite_v2', () => undefined, (ms) => { lastIndexLoadMs = ms; });
const coins = createIndexLoader<CoinSearchLite, { spot: SpotMap | null }>(
  '/api/search/lite?storefront=coins',
  'benched_search_lite_coins_v1',
  (body) => ({ spot: body && typeof body.spot === 'object' ? body.spot : null }),
);

export function getLoadedIndex(): { rows: SearchLite[] | null; version: number } {
  const { rows, version } = main.getLoaded();
  return { rows, version };
}

export function loadSearchIndex(): Promise<SearchLite[]> {
  return main.load();
}

/** Benched Coins index (coin and bullion listings only) plus spot prices for the premium sort. */
export function getLoadedCoinIndex(): { rows: CoinSearchLite[] | null; version: number; spot: SpotMap | null } {
  const { rows, version, meta } = coins.getLoaded();
  return { rows, version, spot: meta?.spot ?? null };
}

export function loadCoinSearchIndex(): Promise<CoinSearchLite[]> {
  return coins.load();
}
