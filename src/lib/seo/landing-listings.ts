/**
 * Live listings for SEO landing pages (topic pages such as /cards/victor-wembanyama-rookie
 * and brand pages such as /brand/nike).
 *
 * Most listings have no `keywords` / `title_lowercase` fields, so the Firestore text query
 * used by the browse grid returns nothing for these pages. Instead we match the landing
 * page's terms against each live listing's title and structured fields (brand, model,
 * sub-category, manufacturer...) with the same matcher the header search uses.
 *
 * Pure helpers live here (unit tested); the cached Firestore read is in landing-listings.server.ts.
 */
import type { Product } from '@/lib/types';
import { toSearchLite, scoreRow, tokenize, normalizeText, type SearchKind } from '@/lib/search/inline';

export type LandingMatchOptions = {
  /** Words every matching listing must contain (title or structured fields). */
  query: string;
  /** Restrict to shoes or cards; omit for both. */
  kind?: Exclude<SearchKind, 'other'>;
  /** Max listings returned. */
  limit?: number;
};

function createdSeconds(p: Product): number {
  const raw: any = (p as any).createdAt;
  if (typeof raw?.seconds === 'number') return raw.seconds;
  if (typeof raw?._seconds === 'number') return raw._seconds;
  if (raw instanceof Date) return Math.floor(raw.getTime() / 1000);
  if (typeof raw === 'string') { const t = Date.parse(raw); return Number.isNaN(t) ? 0 : Math.floor(t / 1000); }
  return 0;
}

/**
 * Live main-site listings (no Pokémon/TCG, no coins, no drafts) matching every query word,
 * best match first, then newest.
 */
export function matchLandingListings(products: Product[], { query, kind, limit = 48 }: LandingMatchOptions): Product[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const numeric = tokens.filter((t) => /^\d+$/.test(t));
  const scored: { p: Product; score: number; created: number }[] = [];
  for (const p of products) {
    if (!p || !p.id) continue;
    const row = toSearchLite(p.id, p as unknown as Record<string, any>);
    if (!row) continue;
    // Landing pages only feature live (available) listings, not checked-in/sold.
    if ((p as any).status && (p as any).status !== 'available') continue;
    if (kind && row.kind !== kind) continue;
    const score = scoreRow(row, tokens);
    if (score <= 0) continue;
    // Model numbers must match exactly: "Jordan 1" must not pull in Jordan 11s.
    if (numeric.length) {
      const words = new Set(normalizeText(`${row.title} ${row.extra || ''}`).split(' '));
      if (!numeric.every((t) => words.has(t))) continue;
    }
    scored.push({ p, score, created: createdSeconds(p) });
  }
  scored.sort((a, b) => b.score - a.score || b.created - a.created);
  return scored.slice(0, limit).map((s) => s.p);
}

/** Latest updatedAt/createdAt (ms) across listings, or undefined. */
export function latestListingDate(products: Product[]): Date | undefined {
  let best = 0;
  for (const p of products) {
    for (const v of [(p as any).updatedAt, (p as any).createdAt]) {
      const s = typeof v?.seconds === 'number' ? v.seconds * 1000
        : typeof v?._seconds === 'number' ? v._seconds * 1000
        : v instanceof Date ? v.getTime()
        : typeof v === 'string' ? Date.parse(v) : 0;
      if (Number.isFinite(s) && s > best) best = s;
    }
  }
  return best > 0 ? new Date(best) : undefined;
}

/**
 * Live main-site listings made by a brand: the brand / manufacturer / sub-category field
 * (or shoe model) names it, or the title starts with it (after a year and "Air"). A player name in the
 * title (e.g. "Michael Jordan" on a Fleer card) does not count. Newest first.
 */
export function matchBrandListings(products: Product[], brand: string, limit = 48): Product[] {
  const phrase = normalizeText(brand);
  if (!phrase) return [];
  const hasPhrase = (text: unknown) => typeof text === 'string' && ` ${normalizeText(text)} `.includes(` ${phrase} `);
  const out: { p: Product; created: number }[] = [];
  for (const p of products) {
    if (!p || !p.id) continue;
    if (!toSearchLite(p.id, p as unknown as Record<string, any>)) continue;
    if ((p as any).status && (p as any).status !== 'available') continue;
    const any = p as any;
    const lead = normalizeText(String(p.title || '')).replace(/^(?:(?:19|20)\d{2}(?:\s?\d{2})?\s)?(?:air\s)?/, '');
    const byField = [any.brand, any.manufacturer, any.subCategory, any.model].some(hasPhrase);
    if (byField || lead === phrase || lead.startsWith(`${phrase} `)) out.push({ p, created: createdSeconds(p) });
  }
  out.sort((a, b) => b.created - a.created);
  return out.slice(0, limit).map((o) => o.p);
}
