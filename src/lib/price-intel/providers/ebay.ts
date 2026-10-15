/**
 * eBay Browse API (official). Needs EBAY_CLIENT_ID + EBAY_CLIENT_SECRET (production keyset).
 * Browse only returns ACTIVE listings; sold prices need the Marketplace Insights API, which
 * eBay grants on application only. If EBAY_INSIGHTS_ENABLED=true we also try sold items.
 * We never scrape eBay pages.
 */
import type { Comp, PriceQuery, ProviderResult } from '../types';
import { titleSimilarity, toAud } from '../stats';

let cachedToken: { token: string; exp: number } | null = null;

function apiBase() {
    const env = (process.env.EBAY_ENV || process.env.EBAY_ENVIRONMENT || 'production').toLowerCase();
    return env === 'sandbox' ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
}

async function token(fetchImpl: typeof fetch, scopes: string): Promise<string | null> {
    const id = process.env.EBAY_CLIENT_ID || process.env.EBAY_APP_ID;
    const secret = process.env.EBAY_CLIENT_SECRET || process.env.EBAY_CERT_ID;
    if (!id || !secret) return null;
    if (cachedToken && cachedToken.exp > Date.now() + 60_000) return cachedToken.token;
    const res = await fetchImpl(`${apiBase()}/identity/v1/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}` },
        body: new URLSearchParams({ grant_type: 'client_credentials', scope: scopes }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    cachedToken = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 7200) * 1000 };
    return cachedToken.token;
}

export function mapEbayItems(items: any[], query: string, kind: 'active' | 'sold'): Comp[] {
    const out: Comp[] = [];
    for (const it of items || []) {
        const p = it.price || it.lastSoldPrice;
        const aud = toAud(Number(p?.value), p?.currency);
        if (!aud) continue;
        if (titleSimilarity(query, it.title) < 0.5) continue;
        out.push({
            source: 'ebay', kind, title: it.title, price: aud,
            originalPrice: Number(p.value), originalCurrency: p.currency,
            url: it.itemWebUrl, condition: it.condition, date: it.lastSoldDate || it.itemCreationDate,
        });
    }
    return out;
}

export async function ebayProvider(q: PriceQuery, fetchImpl: typeof fetch = fetch): Promise<ProviderResult> {
    try {
        const t = await token(fetchImpl, 'https://api.ebay.com/oauth/api_scope');
        if (!t) return { source: 'ebay', ok: false, note: 'not configured: add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET', comps: [] };
        const headers = { Authorization: `Bearer ${t}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_AU', 'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=AU' };
        const params = new URLSearchParams({ q: q.query.slice(0, 100), limit: '30', filter: 'buyingOptions:{FIXED_PRICE},itemLocationCountry:AU' });
        const res = await fetchImpl(`${apiBase()}/buy/browse/v1/item_summary/search?${params}`, { headers, signal: AbortSignal.timeout(8000) } as any);
        if (!res.ok) return { source: 'ebay', ok: false, note: `Browse HTTP ${res.status}`, comps: [] };
        const j: any = await res.json();
        const comps = mapEbayItems(j.itemSummaries || [], q.query, 'active');

        if (process.env.EBAY_INSIGHTS_ENABLED === 'true') {
            const it = await token(fetchImpl, 'https://api.ebay.com/oauth/api_scope/buy.marketplace.insights');
            if (it) {
                const r2 = await fetchImpl(`${apiBase()}/buy/marketplace_insights/v1_beta/item_sales/search?${new URLSearchParams({ q: q.query.slice(0, 100), limit: '30' })}`,
                    { headers: { ...headers, Authorization: `Bearer ${it}` }, signal: AbortSignal.timeout(8000) } as any);
                if (r2.ok) comps.push(...mapEbayItems((await r2.json() as any).itemSales || [], q.query, 'sold'));
            }
        }
        return { source: 'ebay', ok: true, comps };
    } catch (e: any) {
        return { source: 'ebay', ok: false, note: e?.message || 'request failed', comps: [] };
    }
}
