'use server';

/**
 * Fixed-price bundles: seller CRUD + public read helpers.
 * All writes go through these actions (Admin SDK); Firestore rules deny client writes.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { revalidatePath } from 'next/cache';
import { ensureActionAuth } from '@/lib/action-utils';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { isBundleLive, isLineEligible, productTags, validateBundleInput } from '@/lib/bundles';
import type { FixedPriceBundle } from '@/types/bundles';

const col = () => firestoreDb.collection('bundles');

function toBundle(doc: any): FixedPriceBundle {
    return serializeFirestoreData({ id: doc.id, ...doc.data() }) as FixedPriceBundle;
}

/** Live bundles for the given sellers (cart pricing preview). */
export async function getActiveBundlesForSellers(sellerIds: string[]): Promise<FixedPriceBundle[]> {
    const ids = Array.from(new Set((sellerIds || []).filter(Boolean).map(String))).slice(0, 60);
    if (!ids.length) return [];
    try {
        const out: FixedPriceBundle[] = [];
        for (let i = 0; i < ids.length; i += 30) {
            const snap = await col().where('isActive', '==', true).where('sellerId', 'in', ids.slice(i, i + 30)).get();
            snap.docs.forEach((d: any) => out.push(toBundle(d)));
        }
        return out.filter(b => isBundleLive(b));
    } catch (e) {
        console.error('getActiveBundlesForSellers failed', e);
        return [];
    }
}

/** Live bundles this product is eligible for (product page badge). */
export async function getBundlesForProduct(productId: string): Promise<FixedPriceBundle[]> {
    try {
        const doc = await firestoreDb.collection('products').doc(String(productId)).get();
        if (!doc.exists) return [];
        const p: any = { id: doc.id, ...doc.data() };
        const bundles = await getActiveBundlesForSellers([p.sellerId]);
        return bundles.filter(b => isLineEligible(b, { id: p.id, sellerId: p.sellerId, category: p.category, tags: productTags(p) }));
    } catch (e) {
        console.error('getBundlesForProduct failed', e);
        return [];
    }
}

/** Public list of live bundles for /multibuy. */
export async function getPublicBundles(limit = 24): Promise<FixedPriceBundle[]> {
    try {
        const snap = await col().where('isActive', '==', true).limit(100).get();
        return snap.docs.map(toBundle).filter((b: FixedPriceBundle) => isBundleLive(b)).slice(0, limit);
    } catch (e) {
        console.error('getPublicBundles failed', e);
        return [];
    }
}

/** Listings eligible for one bundle (bundle detail on /multibuy). */
export async function getBundleListings(bundleId: string, limit = 48) {
  try {
    const bDoc = await col().doc(String(bundleId)).get();
    if (!bDoc.exists) return { bundle: null, products: [] };
    const bundle = toBundle(bDoc);
    if (!isBundleLive(bundle)) return { bundle: null, products: [] };
    const snap = await firestoreDb.collection('products')
        .where('sellerId', '==', bundle.sellerId)
        .where('status', '==', 'available')
        .limit(300)
        .get();
    const products = snap.docs
        .map((d: any) => ({ id: d.id, ...d.data() }))
        .filter((p: any) => isLineEligible(bundle, { id: p.id, sellerId: p.sellerId, category: p.category, tags: productTags(p) }))
        .slice(0, limit);
    return { bundle, products: serializeFirestoreData(products) };
  } catch (e) {
    console.error('getBundleListings failed', e);
    return { bundle: null, products: [] };
  }
}

// ---------------- Seller management ----------------

export async function listMyBundles(idToken: string): Promise<FixedPriceBundle[]> {
    const { uid } = await ensureActionAuth(idToken);
    const snap = await col().where('sellerId', '==', uid).get();
    return snap.docs.map(toBundle).sort((a: any, b: any) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

/** The seller's own available listings, for the bundle card picker. */
export async function listMyBundleableProducts(idToken: string) {
    const { uid } = await ensureActionAuth(idToken);
    const snap = await firestoreDb.collection('products')
        .where('sellerId', '==', uid)
        .where('status', '==', 'available')
        .limit(500)
        .get();
    return serializeFirestoreData(snap.docs.map((d: any) => {
        const p = d.data();
        return { id: d.id, title: p.title, price: p.price, category: p.category, image: p.imageUrls?.[0] || '', quantity: p.quantity ?? 1 };
    }));
}

export async function saveBundle(idToken: string, input: unknown, bundleId?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const { uid, name: authName } = await ensureActionAuth(idToken);
        const data = validateBundleInput(input);

        // Every picked listing must belong to this seller.
        if (data.listingIds.length) {
            const refs = data.listingIds.map(id => firestoreDb.collection('products').doc(id));
            const docs = await firestoreDb.getAll(...refs);
            const bad = docs.filter((d: any) => !d.exists || d.data()?.sellerId !== uid);
            if (bad.length) return { success: false, error: 'You can only bundle your own listings.' };
        }

        const payload = {
            ...data,
            startsAt: data.startsAt ? Timestamp.fromDate(new Date(data.startsAt)) : null,
            endsAt: data.endsAt ? Timestamp.fromDate(new Date(data.endsAt)) : null,
            sellerId: uid,
            sellerName: authName || null,
            updatedAt: FieldValue.serverTimestamp(),
        };

        let id = bundleId;
        if (bundleId) {
            const ref = col().doc(String(bundleId));
            const existing = await ref.get();
            if (!existing.exists || existing.data()?.sellerId !== uid) return { success: false, error: 'Bundle not found.' };
            await ref.update(payload);
        } else {
            const ref = col().doc();
            await ref.set({ ...payload, timesUsed: 0, createdAt: FieldValue.serverTimestamp() });
            id = ref.id;
        }
        revalidatePath('/multibuy');
        return { success: true, id };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not save bundle.' };
    }
}

export async function deleteBundle(idToken: string, bundleId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid, role } = await ensureActionAuth(idToken);
        const ref = col().doc(String(bundleId));
        const existing = await ref.get();
        if (!existing.exists) return { success: false, error: 'Bundle not found.' };
        if (existing.data()?.sellerId !== uid && role !== 'admin' && role !== 'superadmin') {
            return { success: false, error: 'Bundle not found.' };
        }
        await ref.delete();
        revalidatePath('/multibuy');
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not delete bundle.' };
    }
}

/** Adds a listing the seller owns to some of their existing bundles (used by the listing wizard). */
export async function addListingToBundles(idToken: string, productId: string, bundleIds: string[]): Promise<{ success: boolean; error?: string }> {
    try {
        const { uid } = await ensureActionAuth(idToken);
        const product = await firestoreDb.collection('products').doc(String(productId)).get();
        if (!product.exists || product.data()?.sellerId !== uid) return { success: false, error: 'Listing not found.' };
        for (const id of (bundleIds || []).slice(0, 20)) {
            const ref = col().doc(String(id));
            const b = await ref.get();
            if (!b.exists || b.data()?.sellerId !== uid) continue;
            await ref.update({ listingIds: FieldValue.arrayUnion(String(productId)), updatedAt: FieldValue.serverTimestamp() });
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not update bundles.' };
    }
}
