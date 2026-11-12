'use client';

import type { SearchLite } from '@/lib/search/inline';

/**
 * Browser-side loader for the lite search index (/api/search/lite).
 * One shared in-flight request, kept in memory and sessionStorage so later pages answer instantly.
 */
const SS_KEY = 'benched_search_lite_v1';
const SS_TTL_MS = 5 * 60 * 1000;

let data: SearchLite[] | null = null;
let version = 0;
let inflight: Promise<SearchLite[]> | null = null;
/** Last measured index download time (ms), for diagnostics. */
export let lastIndexLoadMs: number | null = null;

export function getLoadedIndex(): { rows: SearchLite[] | null; version: number } {
  if (!data) {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { at: number; rows: SearchLite[] };
        if (Array.isArray(parsed.rows) && Date.now() - parsed.at < SS_TTL_MS) { data = parsed.rows; version++; }
      }
    } catch { /* ignore */ }
  }
  return { rows: data, version };
}

export function loadSearchIndex(): Promise<SearchLite[]> {
  const cached = getLoadedIndex().rows;
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  inflight = fetch('/api/search/lite', { headers: { accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`search index ${r.status}`);
      return r.json() as Promise<{ rows: SearchLite[] }>;
    })
    .then(({ rows }) => {
      data = Array.isArray(rows) ? rows : [];
      version++;
      lastIndexLoadMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0);
      try { sessionStorage.setItem(SS_KEY, JSON.stringify({ at: Date.now(), rows: data })); } catch { /* quota */ }
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}
