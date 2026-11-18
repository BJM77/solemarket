/** How many Popular Listings tiles fill 3 rows of 5 on the desktop homepage. */
export const POPULAR_LISTINGS_COUNT = 15;

/** Rank by view count; original order (typically newest-first) wins ties. */
export function rankByViews<T extends { id: string; views?: unknown }>(items: T[]): T[] {
  return items
    .map((p, i) => ({ p, i, v: Number(p.views) || 0 }))
    .sort((a, b) => b.v - a.v || a.i - b.i)
    .map((x) => x.p);
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of items) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);
    out.push(p);
  }
  return out;
}

/**
 * Pick the Popular Listings rail: most viewed first, prefer items that are not
 * already in Just Listed, then backfill from the remaining ranked catalog
 * (including Just Listed if needed) so a 5-column desktop grid can show
 * complete rows. `candidates` may be a mix of featured and other active
 * listings; duplicates are dropped, first occurrence kept for tie-breaks.
 */
export function pickPopularListings<T extends { id: string; views?: unknown }>(
  candidates: T[],
  justListedIds: Iterable<string>,
  count = POPULAR_LISTINGS_COUNT,
): T[] {
  const ranked = rankByViews(uniqueById(candidates));
  const excluded = justListedIds instanceof Set ? justListedIds : new Set(justListedIds);
  const preferred = ranked.filter((p) => !excluded.has(p.id));
  if (preferred.length >= count) return preferred.slice(0, count);
  const filled = [...preferred];
  const have = new Set(filled.map((p) => p.id));
  for (const p of ranked) {
    if (filled.length >= count) break;
    if (!have.has(p.id)) {
      have.add(p.id);
      filled.push(p);
    }
  }
  return filled;
}
