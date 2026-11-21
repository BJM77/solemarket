'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { HOLD_MS, activeHolds, availableQuantity, cartHoldId, heldByOtherLegacy, pruneHolds } from '@/lib/checkout/holds';

/** Cart holds never last longer than the standard 30-minute hold. */
const MAX_CART_HOLD_MS = HOLD_MS;

/**
 * Places or extends a signed-in buyer's 30-minute cart hold on one unit of a listing, so they
 * have time to add more multi-deal cards. The hold is a `checkoutHolds` entry keyed
 * `cart:<uid>`: it blocks other buyers, but the same buyer's checkout, request and the seller's
 * accept all ignore it. Guests get no server hold (the cart timer is client-side only).
 */
export async function holdCartItemAction(params: {
  productId: string;
  idToken?: string;
  durationMinutes?: number;
}): Promise<{ success: boolean; expiresAtMs?: number; error?: string }> {
  const { productId, idToken } = params;
  if (!productId || typeof productId !== 'string') return { success: false, error: 'Product ID required' };
  if (!idToken) return { success: false, error: 'Sign in to hold items.' };

  try {
    const auth = await ensureActionAuth(idToken);
    const uid = auth.uid;
    if (!(await checkRateLimit('cart_hold_uid', { limit: 30, windowSeconds: 3600, identifier: uid }))) {
      return { success: false, error: 'Too many holds. Please wait a moment and try again.' };
    }

    const requested = Number(params.durationMinutes ?? 30) * 60_000;
    const durationMs = Math.min(MAX_CART_HOLD_MS, Math.max(60_000, Number.isFinite(requested) ? requested : MAX_CART_HOLD_MS));
    const holdId = cartHoldId(uid)!;
    const docRef = firestoreDb.collection('products').doc(productId);

    return await firestoreDb.runTransaction(async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists) throw new Error('Product not found');
      const data = snap.data() || {};
      const now = Date.now();
      if (data.status !== 'available') throw new Error('This item is no longer available.');
      if (data.sellerId && data.sellerId === uid) throw new Error('You cannot hold your own listing.');
      if (heldByOtherLegacy(data, uid, now)) throw new Error('This card is currently reserved by another buyer.');
      if (availableQuantity(data, now, holdId) < 1) {
        throw new Error(activeHolds(data, now, holdId).length
          ? 'This card is on hold for another buyer right now.'
          : 'This item is out of stock.');
      }

      const expiresAtMs = now + durationMs;
      t.update(docRef, {
        checkoutHolds: [...pruneHolds(data, now, holdId), { orderId: holdId, qty: 1, expiresAtMs }],
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { success: true, expiresAtMs };
    });
  } catch (err: any) {
    console.error('holdCartItemAction error:', err?.message || err);
    return { success: false, error: err?.message || 'Could not hold item' };
  }
}

/** Releases the signed-in buyer's cart hold on a listing (removed from cart). */
export async function releaseCartHoldAction(params: { productId: string; idToken?: string }): Promise<{ success: boolean }> {
  const { productId, idToken } = params;
  if (!productId || !idToken) return { success: false };
  try {
    const auth = await ensureActionAuth(idToken);
    const holdId = cartHoldId(auth.uid)!;
    const docRef = firestoreDb.collection('products').doc(productId);
    await firestoreDb.runTransaction(async (t: any) => {
      const snap = await t.get(docRef);
      if (!snap.exists) return;
      const data = snap.data() || {};
      const holds = Array.isArray(data.checkoutHolds) ? data.checkoutHolds : [];
      if (!holds.some((h: any) => h?.orderId === holdId)) return;
      t.update(docRef, { checkoutHolds: pruneHolds(data, Date.now(), holdId), updatedAt: FieldValue.serverTimestamp() });
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
