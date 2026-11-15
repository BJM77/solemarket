/**
 * Host/path routing between the basketball site (benched.au) and the coins
 * storefront (benched.au/coins now, coins.benched.au once DNS points at App
 * Hosting). Pure functions so the middleware rules can be unit tested.
 *
 * Coins pages always live under src/app/coins. On the coins host a request
 * for /browse is rewritten to /coins/browse internally, and /coins/... links
 * keep working as-is, so links inside the coins site never leave it.
 */
import { STOREFRONTS, resolveStorefrontId } from '@/config/storefronts';
import { isCoinValue, isCoinsPath } from '@/lib/coin-listings';

export const COINS_BASE_PATH = STOREFRONTS.coins.basePath; // '/coins'

/**
 * First path segments served by the shared app on every host (accounts,
 * checkout, messages, admin, legal pages, Next internals). On the coins host
 * these are not rewritten into /coins.
 */
const SHARED_SEGMENTS = new Set([
  '', 'api', '_next', 'sign-in', 'sign-up', 'login', 'register', 'signup', 'forgot-password', 'reset-password',
  'verify-email', 'auth', 'complete-profile', 'checkout', 'cart', 'order', 'orders', 'messages', 'dashboard',
  'profile', 'admin', 'seller', 'sellers', 'product', 'privacy', 'terms', 'help', 'contact', 'about', 'dmca',
  'report-infringement', 'prohibited-items', 'safety-tips', 'trust', 'coincam', 'offline', 'og-image', 'og-default',
  'manifest.webmanifest', 'favicon.ico', 'monitoring',
]);

/** Basketball-site sections: on the coins host they send the visitor back to benched.au. */
const MAIN_SITE_SEGMENTS = new Set([
  'cards', 'shoes', 'pokemon', 'category', 'shop', 'shop-at', 'market', 'market-pulse', 'deals', 'drops',
  'card-drops', 'multibuy', 'multilisting-deals', 'autocard', 'procam', 'shoecam', 'samcam', 'bidsy', 'vault',
  'wtb', 'consign', 'club', 'clubs', 'club-admin', 'club-fundraising', 'journal', 'guides', 'guide', 'vs',
  'size-guide', 'top-stores', 'research', 'brand', 'partners', 'donate', 'authenticity', 'how-it-works', 'log',
]);

export type StorefrontRoute =
  | { type: 'next' }
  | { type: 'rewrite'; pathname: string }
  | { type: 'redirect'; url: string };

export function isCoinsHost(host: string | null | undefined): boolean {
  return resolveStorefrontId(host) === 'coins';
}

/**
 * The basketball origin for a request that came in on the coins host.
 * coins.benched.au -> https://benched.au, coins.localhost:9017 -> http://localhost:9017.
 */
export function mainOriginFor(requestUrl: URL, host: string): string {
  const h = (host || requestUrl.host).trim().toLowerCase();
  if (/^coins\.benched\.au(:\d+)?\.?$/.test(h)) return STOREFRONTS.basketball.origin;
  const stripped = h.replace(/^coins\./, '');
  return `${requestUrl.protocol}//${stripped}`;
}

/** Strip the /coins prefix: /coins -> /, /coins/browse -> /browse. */
export function stripCoinsBase(pathname: string): string {
  if (!isCoinsPath(pathname)) return pathname;
  return pathname.slice(COINS_BASE_PATH.length) || '/';
}

/** Add the /coins prefix: / -> /coins, /browse -> /coins/browse. */
export function withCoinsBase(pathname: string): string {
  if (isCoinsPath(pathname)) return pathname;
  return pathname === '/' || pathname === '' ? COINS_BASE_PATH : `${COINS_BASE_PATH}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
}

/**
 * Public URL of a coins page. Until the coins host is live (storefront
 * `launched: false`) that's benched.au/coins/...; afterwards coins.benched.au/...
 * `path` may be given with or without the /coins prefix.
 */
export function coinsPublicUrl(path: string = '/', launched: boolean = STOREFRONTS.coins.launched): string {
  const inner = stripCoinsBase(path.startsWith('/') ? path : `/${path}`);
  if (launched) return `${STOREFRONTS.coins.origin}${inner === '/' ? '' : inner}`;
  return `${STOREFRONTS.basketball.origin}${withCoinsBase(inner)}`;
}

/** Routing decision for a request on the coins host. */
export function routeCoinsHost(pathname: string, search: string, requestUrl: URL, host: string): StorefrontRoute {
  const first = (pathname.split('/')[1] || '').toLowerCase();
  // /sitemap.xml and /robots.txt on the coins host are the coins versions.
  if (pathname === '/sitemap.xml' || pathname === '/robots.txt') return { type: 'rewrite', pathname: `${COINS_BASE_PATH}${pathname}` };
  // Already a coins path (links inside the coins site use /coins/...): serve as-is.
  if (isCoinsPath(pathname)) return { type: 'next' };
  if (pathname === '/') return { type: 'rewrite', pathname: COINS_BASE_PATH };
  // The coins sell form; seller tools under /sell/... live on the main site.
  if (pathname === '/sell' || pathname === '/sell/') return { type: 'rewrite', pathname: `${COINS_BASE_PATH}/sell` };
  if (first === 'sell' || MAIN_SITE_SEGMENTS.has(first)) {
    return { type: 'redirect', url: `${mainOriginFor(requestUrl, host)}${pathname}${search}` };
  }
  if (SHARED_SEGMENTS.has(first) || pathname.includes('.')) return { type: 'next' };
  return { type: 'rewrite', pathname: withCoinsBase(pathname) };
}

/** Routing decision for a request on benched.au (or any non-coins host). */
export function routeMainHost(pathname: string, searchParams: URLSearchParams, launched: boolean = STOREFRONTS.coins.launched): StorefrontRoute {
  // Once coins.benched.au is live, benched.au/coins/... moves there for good.
  if (launched && isCoinsPath(pathname)) {
    const qs = searchParams.toString();
    return { type: 'redirect', url: `${coinsPublicUrl(pathname, true)}${qs ? `?${qs}` : ''}` };
  }
  // Old coin searches on the basketball site (/browse?category=Coins) go to the coins storefront.
  if ((pathname === '/browse' || pathname === '/search') && (isCoinValue(searchParams.get('category')) || isCoinValue(searchParams.get('subCategory')))) {
    const next = new URLSearchParams();
    for (const key of ['q', 'subCategory', 'sort']) {
      const v = searchParams.get(key);
      if (v && !(key === 'subCategory' && /^coins?$/i.test(v))) next.set(key, v);
    }
    if (/bullion/i.test(searchParams.get('category') || '')) next.set('coinType', 'bullion');
    const qs = next.toString();
    const path = `${COINS_BASE_PATH}/browse`;
    return { type: 'redirect', url: launched ? `${coinsPublicUrl(path, true)}${qs ? `?${qs}` : ''}` : `${path}${qs ? `?${qs}` : ''}` };
  }
  return { type: 'next' };
}
