'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { checkRateLimit } from '@/lib/rate-limit-guard';
import { findReviewableOrder, nextRating, reviewDocId, REVIEWABLE_ORDER_STATUSES, type OrderLike } from '@/lib/reviews/verified';
import { detectOffPlatform } from '@/lib/messaging/off-platform';

const schema = z.object({
  productId: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(10).max(1000),
});

export type ReviewEligibility =
  | { eligible: true; orderId: string }
  | { eligible: false; reason: 'not_signed_in' | 'no_completed_order' | 'already_reviewed' | 'own_listing' };

async function findOrder(uid: string, productId: string) {
  const snap = await firestoreDb
    .collection('orders')
    .where('buyerId', '==', uid)
    .where('status', 'in', [...REVIEWABLE_ORDER_STATUSES])
    .limit(50)
    .get();
  const orders: OrderLike[] = snap.docs.map((d: admin.firestore.QueryDocumentSnapshot) => ({ id: d.id, ...(d.data() as any) }));
  return findReviewableOrder(orders, uid, productId);
}

/** Can the signed-in user review this product? (Only buyers with a delivered/completed order.) */
export async function getReviewEligibility(idToken: string, productId: string): Promise<ReviewEligibility> {
  try {
    const { uid } = await ensureActionAuth(idToken);
    const order = await findOrder(uid, productId);
    if (!order) return { eligible: false, reason: 'no_completed_order' };
    if (order.sellerId === uid) return { eligible: false, reason: 'own_listing' };
    const rid = reviewDocId(order.id, productId);
    const [existing, pending] = await Promise.all([
      firestoreDb.collection('reviews').doc(rid).get(),
      firestoreDb.collection('reviews_pending').doc(rid).get(),
    ]);
    if (existing.exists || pending.exists) return { eligible: false, reason: 'already_reviewed' };
    return { eligible: true, orderId: order.id };
  } catch {
    return { eligible: false, reason: 'not_signed_in' };
  }
}

/**
 * Create a verified-purchase review. The review id is derived from order+product so a
 * buyer can review each purchased item exactly once; the seller's aggregate rating is
 * updated in the same transaction.
 */
export async function submitVerifiedReview(
  idToken: string,
  input: { productId: string; rating: number; comment: string }
): Promise<{ success: boolean; error?: string }> {
  let uid: string;
  let name: string | undefined;
  let picture: string | undefined;
  try {
    const ctx = await ensureActionAuth(idToken);
    uid = ctx.uid;
    name = (ctx as any).name;
    picture = (ctx as any).picture;
  } catch {
    return { success: false, error: 'Please sign in to leave a review.' };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message || 'Invalid review' };
  if (!(await checkRateLimit('review', { limit: 10, windowSeconds: 3600, identifier: uid }))) {
    return { success: false, error: 'Too many reviews submitted. Please try again later.' };
  }
  const { productId, rating, comment } = parsed.data;

  const order = await findOrder(uid, productId);
  if (!order) return { success: false, error: 'Only buyers with a delivered order for this item can review it.' };
  if (order.sellerId === uid) return { success: false, error: "You can't review your own listing." };

  const flags = detectOffPlatform(comment);
  const id = reviewDocId(order.id, productId);
  const reviewRef = firestoreDb.collection('reviews').doc(id);
  // Flagged reviews go to an admin-only queue (default-deny in firestore.rules) so they
  // never appear publicly until approved.
  const pendingRef = firestoreDb.collection('reviews_pending').doc(id);
  const sellerRef = firestoreDb.collection('users').doc(order.sellerId);
  const item = (order.items || []).find((i) => i.id === productId);

  try {
    await firestoreDb.runTransaction(async (tx: admin.firestore.Transaction) => {
      const existing = (await tx.get(reviewRef as admin.firestore.DocumentReference)) as admin.firestore.DocumentSnapshot;
      const seller = (await tx.get(sellerRef as admin.firestore.DocumentReference)) as admin.firestore.DocumentSnapshot;
      const pending = (await tx.get(pendingRef as admin.firestore.DocumentReference)) as admin.firestore.DocumentSnapshot;
      if (existing.exists || pending.exists) throw new Error('already_reviewed');
      tx.create((flags.flagged ? pendingRef : reviewRef) as admin.firestore.DocumentReference, {
        productId,
        productTitle: item?.title || '',
        sellerId: order.sellerId,
        buyerId: uid,
        buyerName: name || 'Verified buyer',
        buyerAvatar: picture || null,
        orderId: order.id,
        rating,
        comment,
        verifiedPurchase: true,
        // Reviews that try to move trade off-platform are held for moderation.
        status: flags.flagged ? 'pending_moderation' : 'published',
        moderationFlags: flags.reasons,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      if (!flags.flagged) {
        tx.set(sellerRef as admin.firestore.DocumentReference, nextRating((seller.data() || {}) as any, rating), { merge: true });
      }
    });
  } catch (e: any) {
    if (e?.message === 'already_reviewed') return { success: false, error: 'You have already reviewed this purchase.' };
    console.error('submitVerifiedReview failed', e);
    return { success: false, error: 'Could not save your review. Please try again.' };
  }

  revalidatePath(`/product/${productId}`);
  revalidatePath(`/seller/${order.sellerId}`);
  return { success: true };
}
