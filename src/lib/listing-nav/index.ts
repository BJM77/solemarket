/** Client helpers for Previous/Next listing navigation (sequence logic: ./sequence, state: ./store). */
/** Main gallery image `sizes`; shared with the next-listing preloader so the srcset matches. */
export const GALLERY_SIZES = '(max-width: 767px) 100vw, (max-width: 1023px) 70vw, 760px';
const LISTING_PATH = /^\/(?:(?:shoes|cards|coins)\/[^/]+|product)\/([^/?#]+)\/?$/;

export function listingIdFromPath(pathname: string | null | undefined): string | null {
  if (!pathname) return null;
  const m = pathname.match(LISTING_PATH);
  return m ? decodeURIComponent(m[1]) : null;
}

export interface ListingNavEntry { id: string; url: string; image?: string }

/** Collect distinct listing links inside `root`, in DOM order. */
export function collectListingLinks(root: ParentNode): ListingNavEntry[] {
  const seen = new Set<string>();
  const out: ListingNavEntry[] = [];
  root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((a) => {
    let path: string;
    try { path = new URL(a.href, window.location.origin).pathname; } catch { return; }
    const id = listingIdFromPath(path);
    if (id && !seen.has(id)) {
      seen.add(id);
      // Original image URL for the tile (next/image keeps it in the ?url= param).
      const tile = a.closest('article, li, [data-product-card]') || a;
      const img = (a.querySelector('img') || tile.querySelector('img')) as HTMLImageElement | null;
      out.push({ id, url: path, image: originalImageUrl(img?.currentSrc || img?.src) });
    }
  });
  return out;
}

export function originalImageUrl(src?: string | null): string | undefined {
  if (!src || src.startsWith('data:')) return undefined;
  try {
    const u = new URL(src, window.location.origin);
    if (u.pathname.startsWith('/_next/image')) return u.searchParams.get('url') || undefined;
    return u.href;
  } catch { return undefined; }
}
