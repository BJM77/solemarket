/**
 * Crawlable page-by-page archives for the main listing sections (/cards/page/2 ...).
 * The section grids use "Load more", which search engines can't click; these plain
 * links give every live listing a crawl path. Pure helpers (unit tested).
 */
import type { Product } from '@/lib/types';
import { toSearchLite } from '@/lib/search/inline';
import { isPokemonListing } from '@/lib/pokemon-listings';
import { isCoinListing } from '@/lib/coin-listings';

export type ListingSection = 'cards' | 'shoes' | 'pokemon';

export const SECTION_PAGE_SIZE = 24;

export const SECTION_TITLES: Record<ListingSection, string> = {
  cards: 'Basketball Cards',
  shoes: 'Sneakers',
  pokemon: 'Pokémon & trading cards',
};

export function createdSeconds(p: Product): number {
  const raw: any = (p as any).createdAt;
  if (typeof raw?.seconds === 'number') return raw.seconds;
  if (typeof raw?._seconds === 'number') return raw._seconds;
  if (raw instanceof Date) return Math.floor(raw.getTime() / 1000);
  if (typeof raw === 'string') { const t = Date.parse(raw); return Number.isNaN(t) ? 0 : Math.floor(t / 1000); }
  return 0;
}

/** Live listings in a section, newest first (same order as the section grid's default sort). */
export function sectionListings(products: Product[], section: ListingSection): Product[] {
  const out = products.filter((p) => {
    if (!p?.id) return false;
    if (section === 'pokemon') {
      const d = p as any;
      return d.status === 'available' && d.isDraft !== true && isPokemonListing(p) && !isCoinListing(p);
    }
    const row = toSearchLite(p.id, p as unknown as Record<string, any>);
    return !!row && row.kind === section;
  });
  return out.sort((a, b) => createdSeconds(b) - createdSeconds(a));
}

export function totalPages(count: number, size = SECTION_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(count / size));
}

/** 1-based page slice. */
export function pageSlice<T>(items: T[], page: number, size = SECTION_PAGE_SIZE): T[] {
  return items.slice((page - 1) * size, page * size);
}

/** Path for a section page: page 1 is the section itself. */
export function sectionPagePath(section: ListingSection, page: number): string {
  return page <= 1 ? `/${section}` : `/${section}/page/${page}`;
}

/** Parses the [n] segment; null unless it is a canonical integer >= 2. */
export function parsePageParam(raw: string): number | null {
  if (!/^[1-9]\d{0,4}$/.test(raw)) return null;
  const n = Number(raw);
  return n >= 2 ? n : null;
}

/** Page numbers to link (first, last, current ±2), with null for gaps. */
export function pageWindow(current: number, total: number): (number | null)[] {
  const wanted = new Set<number>([1, total]);
  for (let i = current - 2; i <= current + 2; i++) if (i >= 1 && i <= total) wanted.add(i);
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | null)[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push(null);
    out.push(n);
  });
  return out;
}
