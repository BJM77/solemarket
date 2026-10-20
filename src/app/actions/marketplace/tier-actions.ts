'use server';
/**
 * Bronze / Silver / Gold bundle tier settings + bulk assignment.
 * Settings live in Firestore settings/multibuy_tiers and are read/written with the Admin SDK
 * only (no client rules needed).
 */
import { firestoreDb as adminDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { revalidatePath } from 'next/cache';
import {
    DEFAULT_TIER_SETTINGS, normalizeTierSettings, validateTierSettings, isBundleTier, tierGroupFor,
    type TierSettings, type BundleTier,
} from '@/lib/tier-bundles';

const SETTINGS_DOC = () => adminDb.collection('settings').doc('multibuy_tiers');

export async function getTierSettings(): Promise<TierSettings> {
    try {
        const doc = await SETTINGS_DOC().get();
        return doc.exists ? normalizeTierSettings(doc.data()) : DEFAULT_TIER_SETTINGS;
    } catch (e) {
        console.error('getTierSettings failed', e);
        return DEFAULT_TIER_SETTINGS;
    }
}

export async function saveTierSettings(raw: unknown, idToken?: string): Promise<{ success: boolean; error?: string; settings?: TierSettings }> {
    try {
        const auth = await ensureActionAuth(idToken, ['admin', 'superadmin']);
        const settings = validateTierSettings(raw);
        await SETTINGS_DOC().set({ ...settings, updatedAt: new Date(), updatedBy: auth.uid });
        revalidatePath('/multibuy');
        revalidatePath('/admin/multibuy');
        return { success: true, settings };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not save settings.' };
    }
}

export interface TierCandidate {
    id: string;
    title: string;
    price: number;
    category: string;
    imageUrl?: string;
    tier: BundleTier | null;
    sellerName?: string;
}

/** Card + coin listings the caller may edit. Admins with scope 'all' see every seller's. */
export async function listTierCandidates(scope: 'mine' | 'all' = 'mine', idToken?: string): Promise<{ success: boolean; error?: string; items?: TierCandidate[] }> {
    try {
        const auth = await ensureActionAuth(idToken);
        const isAdmin = auth.role === 'admin' || auth.role === 'superadmin';
        let q: any = adminDb.collection('products');
        if (!(scope === 'all' && isAdmin)) q = q.where('sellerId', '==', auth.uid);
        else q = q.where('status', '==', 'available');
        const snap = await q.limit(500).get();
        const items: TierCandidate[] = [];
        snap.docs.forEach((d: any) => {
            const p = d.data();
            if (!tierGroupFor(p.category)) return;
            if (p.status && !['available', 'draft'].includes(p.status) && !p.isDraft) return;
            items.push({
                id: d.id, title: String(p.title || 'Untitled'), price: Number(p.price) || 0, category: p.category,
                imageUrl: Array.isArray(p.imageUrls) ? p.imageUrls[0] : undefined,
                tier: isBundleTier(p.multiCardTier) ? p.multiCardTier : null,
                sellerName: p.sellerName,
            });
        });
        items.sort((a, b) => a.title.localeCompare(b.title));
        return { success: true, items };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not load listings.' };
    }
}

/** Put listings into a tier (or clear with null). Sellers can only change their own. */
export async function bulkAssignTier(ids: string[], tier: BundleTier | null, idToken?: string): Promise<{ success: boolean; error?: string; updated?: number; skipped?: number }> {
    try {
        const auth = await ensureActionAuth(idToken);
        const isAdmin = auth.role === 'admin' || auth.role === 'superadmin';
        if (tier !== null && !isBundleTier(tier)) throw new Error('Invalid tier.');
        const unique = Array.from(new Set((ids || []).map(String).filter(Boolean))).slice(0, 500);
        if (!unique.length) throw new Error('Pick at least one listing.');
        let updated = 0, skipped = 0;
        for (let k = 0; k < unique.length; k += 100) {
            const refs = unique.slice(k, k + 100).map(id => adminDb.collection('products').doc(id));
            const docs = await adminDb.getAll(...refs);
            const batch = adminDb.batch();
            docs.forEach((d: any) => {
                const p = d.exists ? d.data() : null;
                if (!p || (!isAdmin && p.sellerId !== auth.uid) || !tierGroupFor(p.category)) { skipped++; return; }
                batch.update(d.ref, tier
                    ? { multiCardTier: tier, multibuyEnabled: true, updatedAt: new Date() }
                    : { multiCardTier: null, updatedAt: new Date() });
                updated++;
            });
            await batch.commit();
        }
        revalidatePath('/multibuy');
        return { success: true, updated, skipped };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not update listings.' };
    }
}
