'use server';

import { getSystemSettingsAdmin } from '@/services/settings-service';
import type { ShippingSettings } from '@/lib/pricing';

/** Public, read-only shipping settings so the cart shows the same fee the server charges. */
export async function getShippingSettings(): Promise<ShippingSettings> {
    const s = await getSystemSettingsAdmin();
    return { freightCharge: Number(s.freightCharge) || 0, freeShippingThreshold: Number(s.freeShippingThreshold) || 0 };
}

/** True when the seller has at least one other available listing (for the combined-shipping nudge). */
export async function sellerHasOtherListings(sellerId: string, excludeId?: string): Promise<boolean> {
    if (typeof sellerId !== 'string' || !/^[\w-]{1,128}$/.test(sellerId)) return false;
    try {
        const { firestoreDb } = await import('@/lib/firebase/admin');
        const snap = await firestoreDb.collection('products')
            .where('sellerId', '==', sellerId)
            .where('status', '==', 'available')
            .select()
            .limit(2)
            .get();
        return snap.docs.some((d: any) => d.id !== excludeId);
    } catch {
        return false;
    }
}
