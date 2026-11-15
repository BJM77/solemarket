/**
 * Coins and bullion live on their own storefront, Benched Coins (served at
 * benched.au/coins now and coins.benched.au once DNS is set up). This file is
 * the one place that decides whether a listing is a coin/bullion listing, so
 * the basketball site and the coins site can never show each other's items.
 *
 * It works with the listings already in Firestore (no data migration): a
 * listing is a coin listing when storefrontId is 'coins', or its category or
 * sub-category says coins / bullion / numismatics / banknotes.
 */

/** Category spellings used for coin and bullion listings. */
export const COIN_CATEGORIES = ['Coins', 'coins', 'Numismatics', 'Bullion', 'bullion'];

/** Category new coin listings are filed under. */
export const COINS_CATEGORY = 'Coins';
/** Category new bullion listings are filed under. */
export const BULLION_CATEGORY = 'Bullion';

/**
 * Sub-categories used by the coins storefront (sell form, CoinCam, browse pills).
 * The first four are coins, the last three bullion.
 */
export const COIN_SUBCATEGORIES = [
  'Australian Coins',
  'World Coins',
  'Proof & Mint Sets',
  'Banknotes',
  'Gold Bullion',
  'Silver Bullion',
  'Platinum & Palladium Bullion',
] as const;
export type CoinSubCategory = (typeof COIN_SUBCATEGORIES)[number];

export const BULLION_SUBCATEGORIES: readonly CoinSubCategory[] = ['Gold Bullion', 'Silver Bullion', 'Platinum & Palladium Bullion'];

const COIN_RE = /\bcoins?\b|bullion|numismat|banknote/i;
const BULLION_RE = /bullion/i;

/** True for a category or sub-category value that means coins / bullion. */
export function isCoinValue(value: unknown): boolean {
  return typeof value === 'string' && COIN_RE.test(value);
}

type CoinFields = { category?: unknown; subCategory?: unknown; storefrontId?: unknown } | null | undefined;

/** True for a coin or bullion listing (belongs on the coins storefront only). */
export function isCoinListing(p: CoinFields): boolean {
  if (!p) return false;
  if (p.storefrontId === 'coins') return true;
  return isCoinValue(p.category) || isCoinValue(p.subCategory);
}

/** True for a bullion listing (category Bullion, or a bullion sub-category). */
export function isBullionListing(p: CoinFields): boolean {
  if (!isCoinListing(p)) return false;
  const cat = typeof p?.category === 'string' ? p.category : '';
  const sub = typeof p?.subCategory === 'string' ? p.subCategory : '';
  return BULLION_RE.test(cat) || BULLION_RE.test(sub);
}

/** Drop coin and bullion listings from a basketball-site list. */
export function withoutCoins<T extends CoinFields>(items: T[]): T[] {
  return items.filter((p) => !isCoinListing(p));
}

/** Keep only coin and bullion listings (coins storefront lists). */
export function onlyCoins<T extends CoinFields>(items: T[]): T[] {
  return items.filter((p) => isCoinListing(p));
}

/** True for a site link that points into the coins section (/coins, /coins/..., /coins?...). */
export function isCoinsHref(href: unknown): boolean {
  if (typeof href !== 'string') return false;
  const path = href.trim().replace(/^https?:\/\/(www\.)?benched\.au/i, '');
  return /^\/coins(?:[/?#]|$)/i.test(path) || /[?&]category=(coins|bullion)(?:&|$)/i.test(path);
}

/** Paths that belong to the coins storefront (/coins and everything under it). */
export function isCoinsPath(pathname: string): boolean {
  return pathname === '/coins' || pathname.startsWith('/coins/');
}

/**
 * Map whatever a seller, CoinCam or the AI typed to one of COIN_SUBCATEGORIES.
 * Falls back to hints in the title/metal, then 'Australian Coins'.
 */
export function normaliseCoinSubCategory(value: unknown, hints: { title?: unknown; metal?: unknown; country?: unknown } = {}): CoinSubCategory {
  const raw = typeof value === 'string' ? value.trim() : '';
  const exact = COIN_SUBCATEGORIES.find((s) => s.toLowerCase() === raw.toLowerCase());
  if (exact) return exact;
  const text = [raw, hints.title, hints.metal].filter((x) => typeof x === 'string').join(' ').toLowerCase();
  if (/bullion|\bbar\b|ingot|\b(1|2|5|10|20|50|100)\s?(oz|g|kg)\b/.test(text)) {
    if (/platinum|palladium/.test(text)) return 'Platinum & Palladium Bullion';
    if (/silver/.test(text)) return 'Silver Bullion';
    if (/gold/.test(text)) return 'Gold Bullion';
  }
  if (/banknote|bank note|\bnote\b|paper money/.test(text)) return 'Banknotes';
  if (/proof|mint set|uncirculated set|\bset\b/.test(text)) return 'Proof & Mint Sets';
  if (/world|foreign|international/.test(raw.toLowerCase())) return 'World Coins';
  const country = typeof hints.country === 'string' ? hints.country.trim().toLowerCase() : '';
  if (country && !/^australia/.test(country)) return 'World Coins';
  return 'Australian Coins';
}

/**
 * Category, sub-category and storefront for a new coin or bullion listing.
 * Every coin listing tool (sell form, CoinCam, admin multi-coin) uses this so
 * new listings are consistent.
 */
export function coinListingClassification(input: { subCategory?: unknown; title?: unknown; metal?: unknown; country?: unknown; isBullion?: boolean }): {
  category: typeof COINS_CATEGORY | typeof BULLION_CATEGORY;
  subCategory: CoinSubCategory;
  storefrontId: 'coins';
} {
  const subCategory = normaliseCoinSubCategory(input.subCategory, input);
  const bullion = input.isBullion === true || BULLION_SUBCATEGORIES.includes(subCategory);
  let sub = subCategory;
  if (input.isBullion === true && !BULLION_SUBCATEGORIES.includes(sub)) {
    const m = String(input.metal || '').toLowerCase();
    sub = /platinum|palladium/.test(m) ? 'Platinum & Palladium Bullion' : /silver/.test(m) ? 'Silver Bullion' : 'Gold Bullion';
  }
  return { category: bullion ? BULLION_CATEGORY : COINS_CATEGORY, subCategory: sub, storefrontId: 'coins' };
}

/** Search params the coins storefront sends with every listing query. */
export interface CoinSearchFlags {
  /** Coins storefront: only coin and bullion listings. */
  coinsOnly?: unknown;
  /** Narrow the coins storefront to coins or bullion. */
  coinType?: unknown;
}

export function wantsCoinsOnly(params: CoinSearchFlags | null | undefined): boolean {
  return params?.coinsOnly === true || String(params?.coinsOnly ?? '') === 'true';
}

/** In-memory check for a listing against the coins storefront flags (true when no flags are set). */
export function matchesCoinFlags(p: CoinFields, params: CoinSearchFlags | null | undefined): boolean {
  if (!wantsCoinsOnly(params)) return true;
  if (!isCoinListing(p)) return false;
  if (params?.coinType === 'bullion') return isBullionListing(p);
  if (params?.coinType === 'coins') return !isBullionListing(p);
  return true;
}
