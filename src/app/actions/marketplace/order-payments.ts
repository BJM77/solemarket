'use server';

/** Cash + PayID order actions. All writes go through the Admin SDK with auth checks. */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { ensureActionAuth } from '@/lib/action-utils';
import { maskPayId, validateSellerPayout } from '@/lib/payments/local';
import { applyOrderTransition } from '@/lib/payments/server';
import { serializeFirestoreData } from '@/lib/utils/serialization';

const payoutRef = (uid: string) => firestoreDb.collection('users').doc(uid).collection('private').doc('payout');

/** Seller: save PayID + account name (private). Sets a public boolean `payIdReady` only. */
export async function savePayoutDetails(idToken: string, input: { payId: string; accountName: string }) {
    try {
        const { uid } = await ensureActionAuth(idToken);
        const payout = validateSellerPayout(input);
        await payoutRef(uid).set({ ...payout, updatedAt: FieldValue.serverTimestamp() });
        await firestoreDb.collection('users').doc(uid).set({ payIdReady: true, acceptsPayID: true }, { merge: true });
        return { success: true, masked: maskPayId(payout.payId) };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not save PayID.' };
    }
}

/** Seller: read own PayID (to edit it). */
export async function getMyPayoutDetails(idToken: string) {
    const { uid } = await ensureActionAuth(idToken);
    const doc = await payoutRef(uid).get();
    if (!doc.exists) return null;
    const d = doc.data();
    return { payId: d.payId as string, accountName: d.accountName as string, payIdType: d.payIdType as string };
}

export async function removePayoutDetails(idToken: string) {
    const { uid } = await ensureActionAuth(idToken);
    await payoutRef(uid).delete();
    await firestoreDb.collection('users').doc(uid).set({ payIdReady: false }, { merge: true });
    return { success: true };
}

/**
 * Buyer: payment instructions for one of their orders. The seller's PayID is only
 * returned to the buyer of this order while it is awaiting PayID payment.
 */
export async function getOrderPaymentDetails(idToken: string, orderId: string) {
    const { uid, role } = await ensureActionAuth(idToken);
    const orderRef = firestoreDb.collection('orders').doc(String(orderId));
    const snap = await orderRef.get();
    if (!snap.exists) throw new Error('Order not found.');
    const o = snap.data();
    const isAdmin = role === 'admin' || role === 'superadmin';
    if (o.buyerId !== uid && !isAdmin) throw new Error('Order not found.');
    let payId: any = null;
    if (o.paymentMethod === 'payid' && o.status === 'awaiting_payment') {
        const p = await orderRef.collection('private').doc('payment').get();
        if (p.exists) payId = { payId: p.data().payId, payIdType: p.data().payIdType, accountName: p.data().accountName };
    }
    return serializeFirestoreData({
        id: snap.id,
        status: o.status,
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference || o.payIdReference,
        paymentDueAt: o.paymentDueAt,
        totalAmount: o.totalAmount,
        sellerName: o.sellerName,
        sellerId: o.sellerId,
        shippingMethod: o.shippingMethod,
        payId,
    });
}

async function transition(idToken: string, orderId: string, action: 'mark_paid' | 'mark_collected' | 'cancel') {
    try {
        const { uid, role } = await ensureActionAuth(idToken);
        const patch = await applyOrderTransition(orderId, action, { uid, role }, action === 'cancel' ? 'cancelled_by_seller' : undefined);
        return { success: true, status: patch.status };
    } catch (e: any) {
        return { success: false, error: e?.message || 'Could not update order.' };
    }
}

/** Seller/admin: funds arrived in the seller's account. Product -> sold. */
export async function markOrderPaid(idToken: string, orderId: string) {
    return transition(idToken, orderId, 'mark_paid');
}

/** Seller/admin: buyer collected (cash pickup or paid pickup). Product -> sold. */
export async function markOrderCollected(idToken: string, orderId: string) {
    return transition(idToken, orderId, 'mark_collected');
}

/** Seller/admin: cancel an unpaid order and re-list the items. */
export async function cancelUnpaidOrder(idToken: string, orderId: string) {
    return transition(idToken, orderId, 'cancel');
}

/** Checkout: which sellers can take PayID (public boolean only, no PayID values). */
export async function getSellersPaymentReadiness(sellerIds: string[]) {
    const ids = Array.from(new Set((sellerIds || []).filter(Boolean).map(String))).slice(0, 50);
    if (!ids.length) return [];
    const docs = await firestoreDb.getAll(...ids.map(id => payoutRef(id)));
    const users = await firestoreDb.getAll(...ids.map(id => firestoreDb.collection('users').doc(id)));
    return ids.map((id, k) => ({
        sellerId: id,
        sellerName: users[k].exists ? (users[k].data()?.displayName || null) : null,
        payIdReady: docs[k].exists && !!docs[k].data()?.payId,
    }));
}
