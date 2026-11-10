/**
 * Coins and bullion are not part of benched.au (a basketball card and sneaker
 * marketplace). The listings and coin code stay in place for a possible
 * separate coins site later (coins.benched.au), but main-site feeds, search,
 * menus, footer and the sitemap leave them out.
 */

/** Category spellings used for coin listings (see RELATED_CATEGORIES in constants/marketplace). */
export const COIN_CATEGORIES = ['Coins', 'coins', 'Numismatics'];

const COIN_RE = /\bcoins?\b|bullion|numismat|banknote/i;

/** True for a category or sub-category value that means coins / bullion. */
export function isCoinValue(value: unknown): boolean {
  return typeof value === 'string' && COIN_RE.test(value);
}

export function isCoinListing(p: { category?: unknown; subCategory?: unknown; storefrontId?: unknown } | null | undefined): boolean {
  if (!p) return false;
  if (p.storefrontId === 'coins') return true;
  return isCoinValue(p.category) || isCoinValue(p.subCategory);
}

/** Drop coin and bullion listings from a main-site list. */
export function withoutCoins<T extends Parameters<typeof isCoinListing>[0]>(items: T[]): T[] {
  return items.filter((p) => !isCoinListing(p));
}

/** True for a site link that points into the coins section (/coins, /coins/..., /coins?...). */
export function isCoinsHref(href: unknown): boolean {
  if (typeof href !== 'string') return false;
  const path = href.trim().replace(/^https?:\/\/(www\.)?benched\.au/i, '');
  return /^\/coins(?:[/?#]|$)/i.test(path) || /[?&]category=coins(?:&|$)/i.test(path);
}

/** benched.au paths that belong to the coins section and should redirect home. */
export function isCoinsPath(pathname: string): boolean {
  return pathname === '/coins' || pathname.startsWith('/coins/');
}
