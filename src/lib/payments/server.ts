/**
 * Server-only helpers for the cash/PayID order lifecycle (Admin SDK).
 * Used by the seller/admin server actions and the release-unpaid-orders cron.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { nextOrderState, type OrderPaymentAction } from '@/lib/payments/local';
import { sendNotification } from '@/services/notifications';
import { sendEmail } from '@/services/email';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';

/**
 * Applies mark_paid / mark_collected / cancel to an order in one transaction and updates
 * the reserved products (sold, or released back to available).
 * `actor` = null means system (cron); otherwise must be the order's seller or an admin.
 */
export async function applyOrderTransition(
    orderId: string,
    action: OrderPaymentAction,
    actor: { uid: string; role?: string } | null,
    reason?: string,
) {
    const orderRef = firestoreDb.collection('orders').doc(String(orderId));
    const result = await firestoreDb.runTransaction(async (t: any) => {
        const snap = await t.get(orderRef);
        if (!snap.exists) throw new Error('Order not found.');
        const order = snap.data();
        if (actor) {
            const isAdmin = actor.role === 'admin' || actor.role === 'superadmin';
            if (order.sellerId !== actor.uid && !isAdmin) throw new Error('Only the seller or an admin can update this order.');
        }
        const patch = nextOrderState(order, action);
        const items: any[] = Array.isArray(order.items) ? order.items : [];
        const productRefs = items.map(i => firestoreDb.collection('products').doc(String(i.id)));
        const productDocs = productRefs.length ? await t.getAll(...productRefs) : [];

        // writes
        t.update(orderRef, {
            status: patch.status,
            paymentStatus: patch.paymentStatus,
            ...(action !== 'cancel' ? { paidAt: FieldValue.serverTimestamp(), payoutStatus: 'not_applicable' } : {}),
            ...((patch as any).collected ? { collectedAt: FieldValue.serverTimestamp() } : {}),
            ...(action === 'cancel' ? { cancelledAt: FieldValue.serverTimestamp(), cancelReason: reason || 'cancelled' } : {}),
            statusUpdatedBy: actor?.uid || 'system',
            updatedAt: FieldValue.serverTimestamp(),
        });
        productDocs.forEach((doc: any, k: number) => {
            if (!doc.exists) return;
            const p = doc.data();
            const qty = Number(items[k]?.quantity || 1);
            if (patch.productStatus === 'sold') {
                if (p.status === 'reserved') {
                    t.update(doc.ref, { status: 'sold', soldAt: FieldValue.serverTimestamp(), reservedBy: FieldValue.delete(), reservedUntil: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp() });
                }
            } else {
                // Release: give the stock back; re-list if it was reserved for this buyer.
                t.update(doc.ref, {
                    quantity: FieldValue.increment(qty),
                    ...(p.status === 'reserved' || p.status === 'sold' ? { status: 'available' } : {}),
                    reservedBy: FieldValue.delete(),
                    reservedUntil: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }
        });
        return { order, patch };
    });

    // Notifications (best effort, outside the transaction).
    const { order } = result;
    const ref = order.paymentReference || order.payIdReference || orderId;
    try {
        if (action === 'mark_paid' || action === 'mark_collected') {
            const msg = action === 'mark_paid'
                ? `The seller confirmed your payment for order ${ref}.`
                : `Order ${ref} has been marked as collected. Enjoy!`;
            await sendNotification(order.buyerId, 'sale', action === 'mark_paid' ? 'Payment received' : 'Order collected', msg, '/profile/orders');
            if (order.buyerEmail) await sendEmail({ to: order.buyerEmail, subject: `Benched order ${ref}: ${action === 'mark_paid' ? 'payment received' : 'collected'}`, html: `<p>${msg}</p><p><a href="${SITE}/profile/orders">View your orders</a></p>` });
        } else {
            const msg = reason === 'payment_timeout'
                ? `Order ${ref} was cancelled because payment wasn't received in time. The items have been re-listed.`
                : `Order ${ref} was cancelled.`;
            await sendNotification(order.buyerId, 'system', 'Order cancelled', msg, '/profile/orders');
            await sendNotification(order.sellerId, 'system', 'Order cancelled', msg, '/seller/dashboard');
            if (order.buyerEmail) await sendEmail({ to: order.buyerEmail, subject: `Benched order ${ref} cancelled`, html: `<p>${msg}</p>` });
        }
    } catch (e) {
        console.error('order transition notification failed', e);
    }
    return result.patch;
}

/** Cancels awaiting_payment orders past paymentDueAt. Returns the number released. */
export async function releaseExpiredOrders(now: Date = new Date(), limit = 200) {
    const snap = await firestoreDb.collection('orders')
        .where('status', '==', 'awaiting_payment')
        .where('paymentDueAt', '<=', now)
        .limit(limit)
        .get();
    let released = 0;
    for (const doc of snap.docs) {
        try {
            await applyOrderTransition(doc.id, 'cancel', null, 'payment_timeout');
            released++;
        } catch (e) {
            console.error('release failed for', doc.id, e);
        }
    }
    return { checked: snap.size, released };
}

/** Notify seller + buyer that an order was placed (with payment instructions for the buyer). */
export async function notifyOrderPlaced(order: any) {
    const ref = order.paymentReference;
    const amount = `$${Number(order.totalAmount).toFixed(2)}`;
    try {
        if (order.paymentMethod === 'payid') {
            await sendNotification(order.sellerId, 'sale', 'New order: awaiting PayID payment',
                `${order.buyerName || 'A buyer'} ordered ${order.items?.length || 1} item(s) for ${amount}. Reference ${ref}. Mark it paid once the money is in your account.`, '/seller/dashboard');
            await sendNotification(order.buyerId, 'system', 'Pay by PayID to secure your order',
                `Pay ${amount} with reference ${ref} within 48 hours or the items are released.`, '/checkout/confirmation');
        } else {
            await sendNotification(order.sellerId, 'sale', 'New order: cash on pickup (Perth)',
                `${order.buyerName || 'A buyer'} will pay ${amount} cash at pickup. Reference ${ref}. Message them to arrange a time.`, '/seller/dashboard');
            await sendNotification(order.buyerId, 'system', 'Arrange your Perth pickup',
                `Message the seller to arrange pickup within 72 hours. Bring ${amount} cash. Reference ${ref}.`, '/messages');
        }
        if (order.buyerEmail) {
            await sendEmail({
                to: order.buyerEmail,
                subject: `Benched order ${ref}: ${order.paymentMethod === 'payid' ? 'how to pay' : 'arrange pickup'}`,
                html: `<p>Thanks for your order. Total ${amount}, reference <b>${ref}</b>.</p>
<p>${order.paymentMethod === 'payid'
        ? 'See the seller\'s PayID on your order page and pay within 48 hours, using the reference above.'
        : 'Message the seller to arrange a Perth pickup within 72 hours and pay cash when you collect.'}</p>
<p><b>Only pay to the PayID shown on benched.au for this order.</b> Never pay a PayID sent by message or email. <a href="${SITE}/contact?topic=order-problem&ref=${ref}">Report a problem</a>.</p>
<p><a href="${SITE}/profile/orders">View your order</a></p>`,
            });
        }
    } catch (e) {
        console.error('notifyOrderPlaced failed', e);
    }
}
