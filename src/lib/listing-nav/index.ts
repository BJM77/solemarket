/** Client helpers for mobile Previous/Next listing navigation. */
export const LISTING_NAV_KEY = 'benched_listing_nav';
const LISTING_PATH = /^\/(?:(?:shoes|cards|coins)\/[^/]+|product)\/([^/?#]+)\/?$/;

export function listingIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const m = pathname.match(LISTING_PATH);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface ListingNavEntry { id: string; url: string }

/** Collect distinct listing links inside `root`, in DOM order. */
export function collectListingLinks(root: ParentNode): ListingNavEntry[] {
  const seen = new Set<string>();
  const out: ListingNavEntry[] = [];
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    let path: string;
    try { path = new URL(a.href, window.location.origin).pathname; } catch { return; }
    const id = listingIdFromPath(path);
    if (id && !seen.has(id)) { seen.add(id); out.push({ id, url: path }); }
  });
  return out;
}

export function saveListingContext(entries: ListingNavEntry[]) {
  try { sessionStorage.setItem(LISTING_NAV_KEY, JSON.stringify(entries)); } catch { /* storage blocked */ }
}

export function readListingContext(): ListingNavEntry[] {
  try {
    const raw = sessionStorage.getItem(LISTING_NAV_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.id === 'string' && typeof e.url === 'string') : [];
  } catch { return []; }
}

export function neighboursFromList(list: ListingNavEntry[], id: string): { prev: string | null; next: string | null } | null {
  const i = list.findIndex((e) => e.id === id);
  if (i < 0) return null;
  return { prev: list[i - 1]?.url ?? null, next: list[i + 1]?.url ?? null };
}

/**
 * When a listing tile is tapped, remember the list it came from: the nearest
 * ancestor holding 2+ distinct listing links (i.e. the grid/list/carousel).
 */
export function captureListingClick(e: MouseEvent) {
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a) return;
  let path: string;
  try { path = new URL(a.href, window.location.origin).pathname; } catch { return; }
  if (!listingIdFromPath(path)) return;
  let node: HTMLElement | null = a.parentElement;
  while (node && node !== document.body) {
    const links = collectListingLinks(node);
    if (links.length >= 2) { saveListingContext(links); return; }
    node = node.parentElement;
  }
}
