/**
 * Indicative precious-metal spot prices in AUD for the coins storefront ticker.
 *
 * - Metal prices: Minted Metal (https://mintedmetal.com/api/prices.json), LBMA
 *   fixes in USD per troy ounce, licensed CC BY 4.0 (attribution + link required).
 * - USD -> AUD: Frankfurter (ECB reference rates), free, no key.
 *
 * Both are fetched on the server and cached for 15 minutes (Next data cache),
 * so visitors never hit either API directly. Any failure returns null and the
 * ticker simply isn't shown: it must never break a page.
 */

export const MINTED_METAL_URL = 'https://mintedmetal.com/api/prices.json';
export const FRANKFURTER_URLS = [
  'https://api.frankfurter.dev/v1/latest?base=USD&symbols=AUD',
  'https://api.frankfurter.app/latest?from=USD&to=AUD',
];
export const SPOT_REVALIDATE_SECONDS = 900;
/** Hide prices older than this (LBMA has no weekend fixes, so allow a long weekend plus slack). */
export const SPOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SpotMetal = 'gold' | 'silver' | 'platinum' | 'palladium';
export const SPOT_METALS: { key: SpotMetal; label: string; symbol: string }[] = [
  { key: 'gold', label: 'Gold', symbol: 'Au' },
  { key: 'silver', label: 'Silver', symbol: 'Ag' },
  { key: 'platinum', label: 'Platinum', symbol: 'Pt' },
  { key: 'palladium', label: 'Palladium', symbol: 'Pd' },
];

export interface SpotQuote {
  metal: SpotMetal;
  label: string;
  symbol: string;
  /** AUD per troy ounce. */
  audPerOz: number;
  /** Change since the previous fix, in percent (null if unknown). */
  changePct: number | null;
}

export interface SpotPrices {
  quotes: SpotQuote[];
  /** When Minted Metal last updated its prices (ISO). */
  updatedAt: string;
  /** Date of the ECB USD/AUD rate used (YYYY-MM-DD). */
  fxDate: string | null;
  usdToAud: number;
  sourceName: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : null;
};

/** Read the USD->AUD rate from a Frankfurter response ({ base: 'USD', rates: { AUD } }). */
export function parseUsdToAud(fx: unknown): { rate: number; date: string | null } | null {
  if (!fx || typeof fx !== 'object') return null;
  const f = fx as { base?: unknown; rates?: Record<string, unknown>; date?: unknown };
  if (f.base !== undefined && f.base !== 'USD') return null;
  const rate = num(f.rates?.AUD);
  // Sanity bounds: AUD per USD has been roughly 0.9-2.1 for decades.
  if (!rate || rate < 0.8 || rate > 3) return null;
  return { rate, date: typeof f.date === 'string' ? f.date : null };
}

/**
 * Turn a Minted Metal response plus a USD->AUD rate into AUD quotes.
 * Returns null when the payload is unusable or too old.
 */
export function parseSpotPrices(minted: unknown, usdToAud: number, fxDate: string | null = null, now: number = Date.now()): SpotPrices | null {
  if (!minted || typeof minted !== 'object' || !(usdToAud > 0)) return null;
  const m = minted as {
    updatedAt?: unknown;
    metals?: Record<string, { price?: unknown; previousPrice?: unknown; currency?: unknown; unit?: unknown }>;
    publisher?: { name?: unknown; url?: unknown };
    license?: { name?: unknown; url?: unknown };
  };
  const updatedAt = typeof m.updatedAt === 'string' ? m.updatedAt : '';
  const updatedMs = Date.parse(updatedAt);
  if (!updatedAt || Number.isNaN(updatedMs) || now - updatedMs > SPOT_MAX_AGE_MS) return null;
  if (!m.metals || typeof m.metals !== 'object') return null;

  const quotes: SpotQuote[] = [];
  for (const { key, label, symbol } of SPOT_METALS) {
    const row = m.metals[key];
    if (!row) continue;
    if (row.currency !== undefined && row.currency !== 'USD') continue;
    if (row.unit !== undefined && !/troy\s*oz/i.test(String(row.unit))) continue;
    const usd = num(row.price);
    if (!usd) continue;
    const prev = num(row.previousPrice);
    quotes.push({
      metal: key,
      label,
      symbol,
      audPerOz: Math.round(usd * usdToAud * 100) / 100,
      changePct: prev ? Math.round(((usd - prev) / prev) * 10000) / 100 : null,
    });
  }
  // Without gold and silver the ticker isn't worth showing.
  if (!quotes.some((q) => q.metal === 'gold') || !quotes.some((q) => q.metal === 'silver')) return null;

  return {
    quotes,
    updatedAt,
    fxDate,
    usdToAud,
    sourceName: typeof m.publisher?.name === 'string' ? m.publisher.name : 'Minted Metal',
    sourceUrl: 'https://mintedmetal.com',
    licenseName: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  };
}

async function fetchJson(url: string, fetcher: typeof fetch): Promise<unknown | null> {
  try {
    const res = await fetcher(url, {
      headers: { Accept: 'application/json' },
      // Next data cache: at most one upstream call per 15 minutes per URL.
      next: { revalidate: SPOT_REVALIDATE_SECONDS, tags: ['spot-prices'] },
      signal: AbortSignal.timeout(4000),
    } as RequestInit);
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (type && !/json/i.test(type)) return null; // e.g. a Cloudflare challenge page
    return await res.json();
  } catch {
    return null;
  }
}

/** Cached AUD spot prices, or null if either source is unavailable. Never throws. */
export async function getSpotPrices(fetcher: typeof fetch = fetch): Promise<SpotPrices | null> {
  try {
    const [minted, fx] = await Promise.all([
      fetchJson(MINTED_METAL_URL, fetcher),
      (async () => {
        for (const url of FRANKFURTER_URLS) {
          const parsed = parseUsdToAud(await fetchJson(url, fetcher));
          if (parsed) return parsed;
        }
        return null;
      })(),
    ]);
    if (!minted || !fx) return null;
    return parseSpotPrices(minted, fx.rate, fx.date);
  } catch {
    return null;
  }
}

/** AUD per gram from AUD per troy ounce. */
export function perGram(audPerOz: number): number {
  return Math.round((audPerOz / 31.1034768) * 100) / 100;
}
