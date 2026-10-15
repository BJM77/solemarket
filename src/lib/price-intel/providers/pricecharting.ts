/**
 * PriceCharting API (paid subscription token: PRICECHARTING_API_TOKEN). Prices are USD cents.
 * Covers trading cards (incl. graded) and some collectibles. Skipped when no token.
 */
import type { Comp, PriceQuery, ProviderResult } from '../types';
import { titleSimilarity, toAud } from '../stats';

const FIELDS: [string, string][] = [['loose-price', 'ungraded'], ['graded-price', 'graded 9'], ['manual-only-price', 'PSA 10'], ['new-price', 'new']];

export function mapPriceCharting(products: any[], query: string): Comp[] {
    const out: Comp[] = [];
    for (const p of products || []) {
        const title = `${p['product-name']} ${p['console-name'] || ''}`.trim();
        if (titleSimilarity(query, title) < 0.5) continue;
        for (const [field, label] of FIELDS) {
            const cents = Number(p[field]);
            const aud = toAud(cents / 100, 'USD');
            if (aud) out.push({ source: 'pricecharting', kind: 'market', title: `${title} (${label})`, price: aud, originalPrice: cents / 100, originalCurrency: 'USD', url: `https://www.pricecharting.com/offers?product=${p.id}`, variant: label });
        }
    }
    return out;
}

export async function priceChartingProvider(q: PriceQuery, fetchImpl: typeof fetch = fetch): Promise<ProviderResult> {
    const t = process.env.PRICECHARTING_API_TOKEN;
    if (!t) return { source: 'pricecharting', ok: false, note: 'not configured: add PRICECHARTING_API_TOKEN (paid)', comps: [] };
    try {
        const res = await fetchImpl(`https://www.pricecharting.com/api/products?${new URLSearchParams({ t, q: q.query.slice(0, 100) })}`, { signal: AbortSignal.timeout(8000) } as any);
        if (!res.ok) return { source: 'pricecharting', ok: false, note: `HTTP ${res.status}`, comps: [] };
        const j: any = await res.json();
        return { source: 'pricecharting', ok: true, comps: mapPriceCharting((j.products || []).slice(0, 10), q.query) };
    } catch (e: any) {
        return { source: 'pricecharting', ok: false, note: e?.message || 'request failed', comps: [] };
    }
}
