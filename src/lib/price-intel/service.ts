import 'server-only';
/**
 * Price Check service: runs providers in parallel, merges comps, summarises a range,
 * caches in Firestore `price_checks/{key}` (server-only) for PRICE_CHECK_TTL_HOURS (default 24).
 */
import { firestoreDb } from '@/lib/firebase/admin';
import type { Comp, PriceQuery, PriceSuggestion, ProviderResult } from './types';
import { cacheKey, summarize } from './stats';
import { ebayProvider } from './providers/ebay';
import { pokemonTcgProvider } from './providers/pokemontcg';
import { priceChartingProvider } from './providers/pricecharting';
import { mapInternalSales } from './providers/internal';

const TTL_MS = Number(process.env.PRICE_CHECK_TTL_HOURS || 24) * 3600_000;

let recentOrders: { at: number; orders: any[] } | null = null;
async function loadRecentOrders(): Promise<any[]> {
    if (recentOrders && Date.now() - recentOrders.at < 10 * 60_000) return recentOrders.orders;
    const snap = await firestoreDb.collection('orders').orderBy('createdAt', 'desc').limit(1000).get();
    const orders = snap.docs.map((d: any) => d.data());
    recentOrders = { at: Date.now(), orders };
    return orders;
}

async function internalProvider(q: PriceQuery): Promise<ProviderResult> {
    try {
        return { source: 'benched', ok: true, comps: mapInternalSales(await loadRecentOrders(), q) };
    } catch (e: any) {
        return { source: 'benched', ok: false, note: e?.message, comps: [] };
    }
}

export async function runPriceCheck(q: PriceQuery, opts: { force?: boolean } = {}): Promise<PriceSuggestion> {
    const query = String(q.query || '').trim().slice(0, 140);
    if (query.length < 3) throw new Error('Enter at least 3 characters to check a price.');
    const key = cacheKey({ ...q, query });
    const ref = firestoreDb.collection('price_checks').doc(key);
    if (!opts.force) {
        try {
            const c = await ref.get();
            if (c.exists && c.data()?.expiresAt > Date.now()) {
                const result = c.data().result as PriceSuggestion;
                // Internal comps for the listing itself are excluded per-call.
                const comps = q.excludeProductId ? result.comps.filter(x => !(x.source === 'benched' && x.url === `/product/${q.excludeProductId}`)) : result.comps;
                return { ...result, comps, ...summarize(comps), cached: true };
            }
        } catch { /* cache miss */ }
    }
    const results = await Promise.all([
        internalProvider({ ...q, query }),
        ebayProvider({ ...q, query }),
        pokemonTcgProvider({ ...q, query }),
        priceChartingProvider({ ...q, query }),
    ]);
    const comps: Comp[] = results.flatMap(r => r.comps)
        .sort((a, b) => (a.kind === 'active' ? 1 : 0) - (b.kind === 'active' ? 1 : 0))
        .slice(0, 60);
    const suggestion: PriceSuggestion = {
        query,
        ...summarize(comps),
        comps,
        providers: results.map(r => ({ source: r.source, ok: r.ok, note: r.note, count: r.comps.length })),
        generatedAt: new Date().toISOString(),
    };
    try {
        await ref.set({ result: JSON.parse(JSON.stringify(suggestion)), expiresAt: Date.now() + TTL_MS, query, category: q.category || null });
    } catch (e) {
        console.error('price check cache write failed', e);
    }
    return suggestion;
}
