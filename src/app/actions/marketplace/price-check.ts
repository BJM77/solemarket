'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { memoryRateLimit } from '@/lib/rate-limit-guard';
import { runPriceCheck } from '@/lib/price-intel/service';
import { classifyListing } from '@/lib/price-intel/stats';
import type { PriceSuggestion } from '@/lib/price-intel/types';

function productQuery(p: any): string {
    return [p.title, p.cardNumber && !String(p.title).includes(p.cardNumber) ? p.cardNumber : null].filter(Boolean).join(' ');
}

/** Seller/admin Price Check for free text (tool page + listing form). */
export async function priceCheckAction(idToken: string, input: { query: string; category?: string; condition?: string; productId?: string }): Promise<{ success: true; result: PriceSuggestion } | { success: false; error: string }> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        if (!memoryRateLimit(`price-check:${uid}`, 30, 10 * 60_000)) {
            return { success: false, error: 'Too many price checks. Try again in a few minutes.' };
        }
        const result = await runPriceCheck({ query: input.query, category: input.category, condition: input.condition, excludeProductId: input.productId });
        return { success: true, result };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Price check failed.' };
    }
}

export interface PriceReportRow {
    productId: string;
    title: string;
    price: number;
    sellerId: string;
    sellerName?: string;
    median: number | null;
    low: number | null;
    high: number | null;
    pctBelow: number | null;
    flag: string;
    confidence: string;
    sampleSize: number;
}

/**
 * Admin: scan available listings and flag ones priced far below market (profit leakage)
 * or far above it (won't sell). Saves the result to price_reports/latest.
 */
export async function runPriceReportAction(idToken: string, limit = 60) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);
        const snap = await firestoreDb.collection('products').where('status', '==', 'available').orderBy('createdAt', 'desc').limit(Math.min(200, Math.max(1, limit))).get();
        const products = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        const rows: PriceReportRow[] = [];
        const queue = [...products];
        const worker = async () => {
            while (queue.length) {
                const p: any = queue.shift();
                try {
                    const s = await runPriceCheck({ query: productQuery(p), category: p.category, excludeProductId: p.id });
                    const { flag, pct } = classifyListing(Number(p.price), s);
                    rows.push({ productId: p.id, title: p.title, price: Number(p.price), sellerId: p.sellerId, sellerName: p.sellerName, median: s.median, low: s.low, high: s.high, pctBelow: pct, flag, confidence: s.confidence, sampleSize: s.sampleSize });
                } catch { /* skip */ }
            }
        };
        await Promise.all([worker(), worker(), worker(), worker()]);
        const report = {
            generatedAt: new Date().toISOString(),
            scanned: rows.length,
            belowMarket: rows.filter(r => r.flag === 'below_market').sort((a, b) => (b.pctBelow || 0) - (a.pctBelow || 0)),
            aboveMarket: rows.filter(r => r.flag === 'above_market').sort((a, b) => (a.pctBelow || 0) - (b.pctBelow || 0)),
            unknown: rows.filter(r => r.flag === 'unknown').length,
            ok: rows.filter(r => r.flag === 'ok').length,
        };
        await firestoreDb.collection('price_reports').doc('latest').set(report);
        return { success: true as const, report };
    } catch (e: any) {
        return { success: false as const, error: e?.message || 'Report failed.' };
    }
}

export async function getLatestPriceReportAction(idToken: string) {
    await ensureActionAuth(idToken, ['admin', 'superadmin']);
    const d = await firestoreDb.collection('price_reports').doc('latest').get();
    return d.exists ? (d.data() as Awaited<ReturnType<typeof runPriceReportAction>> extends { report: infer R } ? R : any) : null;
}
