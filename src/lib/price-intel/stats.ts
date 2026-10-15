/** Pure statistics for price suggestions (unit tested). */
import type { Comp, ListingFlag, PriceSuggestion } from './types';

export const FX_TO_AUD: Record<string, number> = {
    AUD: 1,
    USD: Number(process.env.PRICE_FX_USD_AUD || 1.52),
    EUR: Number(process.env.PRICE_FX_EUR_AUD || 1.65),
    GBP: Number(process.env.PRICE_FX_GBP_AUD || 1.95),
};

export function toAud(amount: number, currency = 'AUD'): number | null {
    const rate = FX_TO_AUD[String(currency).toUpperCase()];
    if (!rate || !Number.isFinite(amount) || amount <= 0) return null;
    return Math.round(amount * rate * 100) / 100;
}

export function quantile(sorted: number[], q: number): number {
    if (!sorted.length) return NaN;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Tukey fences (1.5 IQR); keeps everything when there are fewer than 4 points. */
export function removeOutliers(values: number[]): number[] {
    const s = [...values].filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (s.length < 4) return s;
    const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75), iqr = q3 - q1;
    return s.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
}

/** Asking prices run above what things sell for; discount active listings. */
export const ACTIVE_LISTING_FACTOR = 0.9;

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Suggested range from comps. Sold + market prices are preferred; active asking prices
 * (discounted 10%) are only used when there are fewer than 3 sold/market comps.
 */
export function summarize(comps: Comp[]): Pick<PriceSuggestion, 'low' | 'median' | 'high' | 'sampleSize' | 'confidence'> {
    const strong = comps.filter(c => c.kind !== 'active').map(c => c.price);
    const weak = comps.filter(c => c.kind === 'active').map(c => c.price * ACTIVE_LISTING_FACTOR);
    const base = strong.length >= 3 ? strong : [...strong, ...weak];
    const vals = removeOutliers(base);
    if (!vals.length) return { low: null, median: null, high: null, sampleSize: 0, confidence: 'none' };
    const confidence = strong.length >= 8 ? 'high' : vals.length >= 5 ? 'medium' : 'low';
    return {
        low: round(quantile(vals, 0.25)),
        median: round(quantile(vals, 0.5)),
        high: round(quantile(vals, 0.75)),
        sampleSize: vals.length,
        confidence,
    };
}

/** Positive = priced below market median by that %. */
export function percentBelowMarket(price: number, median: number | null): number | null {
    if (!median || !(price > 0)) return null;
    return Math.round(((median - price) / median) * 100);
}

export const BELOW_MARKET_THRESHOLD = 25; // % under median = profit leakage
export const ABOVE_MARKET_THRESHOLD = 40; // % over median = unlikely to sell

export function classifyListing(price: number, s: Pick<PriceSuggestion, 'median' | 'confidence'>): { flag: ListingFlag; pct: number | null } {
    if (!s.median || s.confidence === 'none') return { flag: 'unknown', pct: null };
    const below = percentBelowMarket(price, s.median)!;
    if (below >= BELOW_MARKET_THRESHOLD) return { flag: 'below_market', pct: below };
    if (-below >= ABOVE_MARKET_THRESHOLD) return { flag: 'above_market', pct: below };
    return { flag: 'ok', pct: below };
}

export function priceWarning(price: number, s: Pick<PriceSuggestion, 'median' | 'confidence'>): string | null {
    const { flag, pct } = classifyListing(price, s);
    if (flag === 'below_market') return `Priced ${pct}% below market. You could be leaving money on the table.`;
    if (flag === 'above_market') return `Priced ${Math.abs(pct!)}% above market. It may be slow to sell.`;
    return null;
}

const STOP = new Set(['the', 'and', 'with', 'for', 'card', 'cards', 'mint', 'nm', 'near', 'lp', 'psa', 'bgs', 'cgc', 'sgc', 'graded', 'raw', 'rare', 'holo', 'new', 'used', 'tcg', 'pokemon', 'pokémon', 'size', 'us', 'mens', 'womens', 'shoe', 'shoes', 'sneakers']);

/** Lower-case keyword tokens for matching titles. */
export function keywords(q: string): string[] {
    return Array.from(new Set(String(q).toLowerCase().normalize('NFKD').replace(/[^\w\s/#.-]/g, ' ').split(/\s+/)
        .map(t => t.replace(/^[#.-]+|[.-]+$/g, '')).filter(t => t.length > 1 && !STOP.has(t))));
}

/** Share of query keywords present in a title (0-1). */
export function titleSimilarity(query: string, title: string): number {
    const k = keywords(query);
    if (!k.length) return 0;
    const t = ` ${String(title).toLowerCase()} `;
    return k.filter(w => t.includes(w)).length / k.length;
}

/** Stable cache key for a query. */
export function cacheKey(q: { query: string; category?: string; condition?: string }): string {
    const raw = [keywords(q.query).sort().join(' '), (q.category || '').toLowerCase(), (q.condition || '').toLowerCase()].join('|');
    let h = 5381;
    for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0;
    return `pc_${h.toString(36)}_${raw.length}`;
}

/** Card-number like "4/102" or "#4". */
export function parseCardNumber(q: string): string | null {
    const m = String(q).match(/(?:^|\s)#?(\d{1,3})\s*\/\s*\d{1,3}(?:\s|$)/) || String(q).match(/(?:^|\s)#(\d{1,3})(?:\s|$)/);
    return m ? m[1] : null;
}
