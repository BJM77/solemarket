'use server';

/**
 * Matching Bronze / Silver / Gold listings a buyer can add to finish a deal.
 * Uses the deployed (sellerId, status, createdAt) index, then filters tier and
 * group in memory so no new composite index is required.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { isBundleTier, type BundleTier, type TierGroup, TIER_GROUPS } from '@/lib/tier-bundles';
import { selectDealSuggestions, SUGGESTION_FETCH_LIMIT } from '@/lib/tier-suggestions';
import type { Product } from '@/lib/types';

export interface DealSuggestionQuery {
    sellerId: string;
    tier: BundleTier;
    group: TierGroup;
    remaining: number;
    excludeIds?: string[];
    buyerId?: string | null;
}

export async function getDealSuggestionsAction(params: DealSuggestionQuery): Promise<Product[]> {
    try {
        const sellerId = typeof params?.sellerId === 'string' ? params.sellerId.trim() : '';
        if (!sellerId || sellerId.length > 128) return [];
        if (!isBundleTier(params?.tier)) return [];
        if (!TIER_GROUPS.includes(params?.group)) return [];
        const remaining = Math.floor(Number(params.remaining));
        if (!Number.isFinite(remaining) || remaining <= 0) return [];

        const excludeIds = Array.isArray(params.excludeIds)
            ? params.excludeIds.map(String).filter(Boolean).slice(0, 100)
            : [];
        const buyerId = typeof params.buyerId === 'string' && params.buyerId.trim()
            ? params.buyerId.trim().slice(0, 128)
            : null;

        const snap = await firestoreDb
            .collection('products')
            .where('sellerId', '==', sellerId)
            .where('status', '==', 'available')
            .orderBy('createdAt', 'desc')
            .limit(SUGGESTION_FETCH_LIMIT)
            .get();

        const listings = snap.docs.map((d: any) => serializeFirestoreData({ id: d.id, ...d.data() })) as Product[];
        return selectDealSuggestions(listings, {
            sellerId,
            tier: params.tier,
            group: params.group,
            remaining,
            excludeIds,
            buyerId,
        });
    } catch (err) {
        console.error('getDealSuggestionsAction failed', err);
        return [];
    }
}
