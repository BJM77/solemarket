'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';

/**
 * Places or extends a 30-minute cart hold on items so a buyer has time
 * to browse additional multi-deal cards without losing their selections.
 */
export async function holdCartItemAction(params: {
  productId: string;
  cartHoldId: string;
  durationMinutes?: number;
  idToken?: string;
}): Promise<{ success: boolean; expiresAtMs?: number; error?: string }> {
  const { productId, cartHoldId, durationMinutes = 30, idToken } = params;

  if (!productId || !cartHoldId) {
    return { success: false, error: 'Product ID and Cart Hold ID required' };
  }

  try {
    let buyerKey = cartHoldId;
    if (idToken) {
      try {
        const auth = await ensureActionAuth(idToken);
        if (auth?.uid) buyerKey = auth.uid;
      } catch {
        // Fallback to cartHoldId if guest or unauthenticated
      }
    }

    const now = Date.now();
    const expiresAtMs = now + durationMinutes * 60 * 1000;
    const expiresAt = new Date(expiresAtMs);

    const docRef = firestoreDb.collection('products').doc(productId);

    return await firestoreDb.runTransaction(async (transaction: any) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists) throw new Error('Product not found');
      const data = snap.data();

      // Check existing legacy hold
      const currentHoldExpiresAt = data.holdExpiresAt?.toDate?.();
      const isCurrentlyHeld = currentHoldExpiresAt && currentHoldExpiresAt > new Date(now);
      if (isCurrentlyHeld && data.heldBy && data.heldBy !== buyerKey && data.heldBy !== cartHoldId) {
        throw new Error('This card is currently reserved by another buyer.');
      }

      // Check checkoutHolds array
      const holds = Array.isArray(data.checkoutHolds) ? data.checkoutHolds : [];
      const activeOtherHolds = holds.filter(
        (h: any) => h && Number(h.expiresAtMs) > now && h.orderId !== cartHoldId && h.orderId !== buyerKey
      );

      const availableQty = (data.quantity ?? 1) - activeOtherHolds.reduce((sum: number, h: any) => sum + (h.qty || 1), 0);
      if (availableQty <= 0) {
        throw new Error('This card is on hold for another buyer right now.');
      }

      // Update checkoutHolds array
      const updatedHolds = [
        ...holds.filter((h: any) => h && Number(h.expiresAtMs) > now && h.orderId !== cartHoldId && h.orderId !== buyerKey),
        { orderId: cartHoldId, qty: 1, expiresAtMs, isCartHold: true }
      ];

      transaction.update(docRef, {
        checkoutHolds: updatedHolds,
        heldBy: buyerKey,
        holdExpiresAt: Timestamp.fromDate(expiresAt),
        holdReason: 'checkout',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return { success: true, expiresAtMs };
    });
  } catch (err: any) {
    console.error('holdCartItemAction error:', err);
    return { success: false, error: err?.message || 'Could not hold item' };
  }
}
