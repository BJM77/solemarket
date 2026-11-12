/**
 * Path prefixes where the top market ticker should not render.
 * A path matches if it equals a prefix or is nested under it
 * (`/sell/review` matches, `/sell/reviews` does not).
 */
export const HIDDEN_TICKER_PREFIXES = [
  // (a) All admin pages
  '/admin',

  // (b) Add / edit listing: sell forms, create/edit, drafts, bulk upload
  '/sell/create',
  '/sell/wizard',
  '/sell/autofast',
  '/sell/fast-bulk',
  '/sell/proload',
  '/sell/bulk',
  '/sell/bulk-csv-lister',
  '/sell/drafts-review',
  '/sell/review',
  '/profile/listings/bulk',

  // (b) Listing scanners (cards, shoes, and related capture tools)
  '/autocard',
  '/shoecam',
  '/procam',
  '/samcam',
  '/coincam',

  // (c) Checkout areas: cart, checkout, guest request/buy, order tokens
  '/cart',
  '/checkout',
  '/order',
] as const;

/** True when pathname is exactly prefix or a subpath of it. */
export function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  const path = normalizePath(pathname);
  const base = normalizePath(prefix);
  if (base === '/') return path === '/';
  return path === base || path.startsWith(`${base}/`);
}

export function shouldHideMarketTicker(pathname?: string | null): boolean {
  if (!pathname) return false;
  return HIDDEN_TICKER_PREFIXES.some((prefix) => pathMatchesPrefix(pathname, prefix));
}

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] || '/';
  if (withoutQuery === '/') return '/';
  return withoutQuery.replace(/\/+$/, '') || '/';
}
