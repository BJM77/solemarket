/**
 * Guest checkout (no account, no email): name, email and mobile, then the item is held for
 * 30 minutes and the buyer sees the seller's PayID on a private order page. Fake holds are kept
 * down by per-identity hold limits, rate limits, a honeypot and a minimum time on the form.
 * Server only: every write goes through the Admin SDK. Firestore rules deny clients access to
 * guest_checkout_tickets and to guest orders.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { resolveSellerName } from '@/lib/utils/seller-name';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateShipping, calculateTax } from '@/lib/pricing';
import { generatePaymentReference } from '@/lib/payments/local';
import { validateGuestDetails, checkFormTiming, isHoneypotFilled, MIN_FORM_MS, type GuestDetailsInput, type GuestDetails } from './guest-validation';
import { generateOrderToken, identityHash, isPlausibleOrderToken, orderTokenHash, randomId } from './guest-crypto';
import { addHold, assertCanHold, assertHoldLimits, countActiveHoldOrders, holdExpiry, isActiveHoldOrder, toMs } from './holds';

const TICKETS = 'guest_checkout_tickets';

export interface GuestContext {
    ip: string;
    deviceId?: string | null;
}

function identityHashes(details: Pick<GuestDetails, 'email' | 'mobile'>, ctx: GuestContext) {
    const device = typeof ctx.deviceId === 'string' && /^[\w-]{8,64}$/.test(ctx.deviceId) ? ctx.deviceId : null;
    const ip = ctx.ip && ctx.ip !== 'unknown' ? ctx.ip : null;
    return {
        email: identityHash('email', details.email),
        phone: identityHash('phone', details.mobile),
        device: device ? identityHash('device', device) : null,
        ip: ip ? identityHash('ip', ip) : null,
    };
}

type Hashes = ReturnType<typeof identityHashes>;
const HASH_FIELDS = { email: 'guestEmailHash', phone: 'guestPhoneHash', device: 'guestDeviceHash', ip: 'guestIpHash' } as const;

/** Active-hold counts per identity (orders awaiting payment with an unexpired hold). */
async function countHolds(hashes: Hashes, nowMs: number, t?: any) {
    const counts: Partial<Record<keyof Hashes, number>> = {};
    for (const key of Object.keys(HASH_FIELDS) as (keyof Hashes)[]) {
        const h = hashes[key];
        if (!h) continue;
        // Equality-only filters: served by single-field indexes, no composite index needed.
        const q = firestoreDb.collection('orders').where(HASH_FIELDS[key], '==', h).where('status', '==', 'awaiting_payment').limit(20);
        const snap = t ? await t.get(q) : await q.get();
        counts[key] = countActiveHoldOrders(snap.docs.map((d: any) => d.data()), nowMs);
    }
    return counts;
}

function assertGuestBuyable(product: any) {
    if (!product) throw new Error('This listing no longer exists.');
    if (product.isDraft || product.isPrivate) throw new Error('This listing is not for sale.');
    if (product.externalUrl) throw new Error('This item is sold on another site. Use the button on the listing.');
    if (product.isUntimed || product.isReverseBidding) throw new Error('This listing takes offers, not direct purchases.');
}

async function quote(product: any, shippingMethod: 'pickup' | 'shipping') {
    const settings = await getSystemSettingsAdmin();
    const subtotal = Math.round(Number(product.price || 0) * 100) / 100;
    const shippingCost = calculateShipping(subtotal, shippingMethod, { freightCharge: settings.freightCharge, freeShippingThreshold: settings.freeShippingThreshold });
    return { subtotal, shippingCost, totalAmount: Math.max(0, Math.round((subtotal + shippingCost) * 100) / 100), standardTaxRate: settings.standardTaxRate };
}

/**
 * Opens a checkout form: a one-use ticket that records when the form was shown, so a hold
 * can't be placed faster than a person could fill it in (bots posting straight away fail).
 */
export async function issueGuestCheckoutTicket(productId: string, ctx: GuestContext) {
    if (!/^[\w-]{1,128}$/.test(String(productId || ''))) throw new Error('Listing not found.');
    const nowMs = Date.now();
    const ticketId = randomId(18);
    await firestoreDb.collection(TICKETS).doc(ticketId).set({
        productId: String(productId),
        ipHash: ctx.ip && ctx.ip !== 'unknown' ? identityHash('ip', ctx.ip) : null,
        issuedAtMs: nowMs,
        used: false,
        createdAt: FieldValue.serverTimestamp(),
        // TTL policy field (optional, free): lets Firestore delete old tickets.
        expireAt: Timestamp.fromMillis(nowMs + 24 * 3600_000),
    });
    return { ticketId, issuedAtMs: nowMs, minFormMs: MIN_FORM_MS };
}

export interface PlaceGuestHoldInput extends GuestDetailsInput {
    productId: string;
    ticketId: string;
    /** Honeypot: hidden from people, bots fill it in. */
    website?: unknown;
}

/**
 * Guest checkout without an account or email code: checks the form ticket, honeypot and limits,
 * then in one transaction re-checks the item and limits, creates the order (with the seller's
 * PayID snapshot) and adds a 30-minute hold to the listing.
 * Two buyers racing for the last unit: Firestore retries the loser's transaction, which then
 * sees the winner's hold and fails with "on hold for another buyer".
 */
export async function placeGuestHold(input: PlaceGuestHoldInput, ctx: GuestContext) {
    if (isHoneypotFilled(input?.website)) throw new Error("We couldn't place this order. Please refresh the page and try again.");
    const details = validateGuestDetails(input);
    const productId = String(input?.productId || '');
    if (!/^[\w-]{1,128}$/.test(productId)) throw new Error('Listing not found.');
    const ticketId = String(input?.ticketId || '');
    if (!/^[\w-]{10,64}$/.test(ticketId)) throw new Error('This checkout form has expired. Please close it and tap Buy Now again.');

    const ticketRef = firestoreDb.collection(TICKETS).doc(ticketId);
    const pre = await ticketRef.get();
    if (!pre.exists) throw new Error('This checkout form has expired. Please close it and tap Buy Now again.');
    const ticket = pre.data() as any;
    if (ticket.used) throw new Error('This checkout form was already used. Please close it and tap Buy Now again.');
    if (ticket.productId !== productId) throw new Error('This checkout form has expired. Please close it and tap Buy Now again.');
    const timingError = checkFormTiming(Number(ticket.issuedAtMs), Date.now());
    if (timingError) throw new Error(timingError);

    const hashes = identityHashes(details, ctx);
    // Cheap pre-check outside the transaction (re-checked inside).
    assertHoldLimits(await countHolds(hashes, Date.now()));

    const productRef = firestoreDb.collection('products').doc(productId);
    const { token, hash: tokenHash } = generateOrderToken();

    const order = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        // ---------- reads ----------
        const tk = await t.get(ticketRef);
        if (!tk.exists || tk.data().used) throw new Error('This checkout form was already used. Please close it and tap Buy Now again.');
        const pSnap = await t.get(productRef);
        const product = pSnap.exists ? { ...pSnap.data(), id: pSnap.id } as any : null;
        assertGuestBuyable(product);
        const sellerId = String(product.sellerId);
        const [userDoc, payoutDoc] = await t.getAll(
            firestoreDb.collection('users').doc(sellerId),
            firestoreDb.collection('users').doc(sellerId).collection('private').doc('payout'),
        );
        const counts = await countHolds(hashes, nowMs, t);

        // ---------- checks ----------
        assertCanHold(product, 1, nowMs);
        assertHoldLimits(counts);
        const payout = payoutDoc.exists ? payoutDoc.data() : null;
        if (!payout?.payId) throw new Error("This seller doesn't take PayID yet, so guest checkout isn't available. Sign in to arrange a cash pickup, or message the seller.");

        const sellerProfile = userDoc.exists ? userDoc.data() : null;
        const q = await quote(product, details.shippingMethod);
        const isBusiness = sellerProfile?.role === 'business';
        const expiresAtMs = holdExpiry(nowMs);
        const orderRef = firestoreDb.collection('orders').doc();
        const paymentReference = generatePaymentReference();
        const newOrder = {
            groupOrderId: `GRP-${nowMs}-${randomId(4).toUpperCase()}`,
            items: [{
                id: product.id,
                title: product.title || 'Item',
                price: Number(product.price || 0),
                discountedPrice: Number(product.price || 0),
                lineTotal: q.subtotal,
                quantity: 1,
                image: product.imageUrls?.[0] || '',
                sellerId,
                dealId: null,
            }],
            totalAmount: q.totalAmount,
            subtotal: q.subtotal,
            shippingCost: q.shippingCost,
            taxAmount: isBusiness ? calculateTax(q.subtotal, q.standardTaxRate, true) : 0,
            discountAmount: 0,
            discountCode: null,
            buyerId: null,
            isGuest: true,
            buyerEmail: details.email,
            buyerName: details.name,
            buyerPhone: details.mobile,
            guestEmailHash: hashes.email,
            guestPhoneHash: hashes.phone,
            guestDeviceHash: hashes.device || null,
            guestIpHash: hashes.ip || null,
            guestAccessTokenHash: tokenHash,
            sellerId,
            sellerName: resolveSellerName(sellerProfile as any, product.sellerName),
            isBusinessSeller: isBusiness,
            status: 'awaiting_payment',
            paymentStatus: 'pending',
            paymentMethod: 'payid',
            paymentReference,
            payIdReference: paymentReference,
            paymentDueAt: Timestamp.fromMillis(expiresAtMs),
            holdExpiresAt: Timestamp.fromMillis(expiresAtMs),
            stockMode: 'hold',
            pickupLocation: null,
            shippingMethod: details.shippingMethod,
            shippingAddress: details.shippingAddress,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            nudgeCount: 0,
            lastNudgeAt: null,
        };

        // ---------- writes ----------
        t.update(ticketRef, { used: true, usedAt: FieldValue.serverTimestamp(), orderId: orderRef.id });
        t.set(orderRef, newOrder);
        t.set(orderRef.collection('private').doc('payment'), {
            payId: payout.payId,
            payIdType: payout.payIdType || null,
            accountName: payout.accountName || null,
            createdAt: FieldValue.serverTimestamp(),
        });
        t.update(productRef, {
            checkoutHolds: addHold(product, { orderId: orderRef.id, qty: 1, expiresAtMs }, nowMs),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { id: orderRef.id, ...newOrder };
    });

    // Seller: in-app notification + push to their phone/computer. No email to anyone.
    try {
        const { notifyOrderPlaced } = await import('@/lib/payments/server');
        await notifyOrderPlaced(order);
    } catch (e) {
        console.error('guest notifyOrderPlaced failed', e);
    }
    try {
        const { sendTelegramNotification } = await import('@/lib/telegram');
        await sendTelegramNotification(`<b>🛒 Guest order (PayID, 30 min hold)</b>\n<b>Item:</b> ${order.items[0].title}\n<b>Total:</b> $${Number(order.totalAmount).toFixed(2)}\n<b>Seller:</b> ${order.sellerName}`);
    } catch { /* best effort */ }

    return {
        orderToken: token,
        orderId: order.id,
        paymentReference: order.paymentReference,
        totalAmount: order.totalAmount,
        holdExpiresAtMs: toMs(order.holdExpiresAt),
        title: order.items[0].title,
    };
}

async function findOrderByToken(token: string) {
    if (!isPlausibleOrderToken(token)) return null;
    const snap = await firestoreDb.collection('orders').where('guestAccessTokenHash', '==', orderTokenHash(token)).limit(1).get();
    return snap.empty ? null : snap.docs[0];
}

/**
 * The guest's order page. Only this order's own fields, plus the seller's PayID while the hold
 * is running. Expired holds are tidied up lazily here.
 */
export async function getGuestOrderByToken(token: string) {
    let doc = await findOrderByToken(token);
    if (!doc) return null;
    let o = doc.data() as any;
    const nowMs = Date.now();
    if (o.status === 'awaiting_payment' && o.stockMode === 'hold' && !isActiveHoldOrder(o, nowMs)) {
        try {
            const { applyOrderTransition } = await import('@/lib/payments/server');
            await applyOrderTransition(doc.id, 'cancel', null, 'payment_timeout');
        } catch (e) { console.error('lazy release failed', doc.id, e); }
        doc = (await doc.ref.get()) as any;
        o = doc!.data();
    }
    const active = isActiveHoldOrder(o, nowMs);
    let payId: { payId: string; payIdType: string | null; accountName: string | null } | null = null;
    if (o.paymentMethod === 'payid' && o.status === 'awaiting_payment' && active) {
        const p = await doc!.ref.collection('private').doc('payment').get();
        if (p.exists) payId = { payId: p.data()!.payId, payIdType: p.data()!.payIdType || null, accountName: p.data()!.accountName || null };
    }
    const item = Array.isArray(o.items) ? o.items[0] : null;
    return serializeFirestoreData({
        id: doc!.id,
        status: o.status,
        cancelReason: o.cancelReason || null,
        paymentMethod: o.paymentMethod,
        paymentReference: o.paymentReference || o.payIdReference,
        paymentDueAt: o.paymentDueAt,
        holdExpiresAt: o.holdExpiresAt || null,
        holdActive: active,
        totalAmount: o.totalAmount,
        subtotal: o.subtotal,
        shippingCost: o.shippingCost,
        shippingMethod: o.shippingMethod,
        sellerName: o.sellerName,
        sellerId: o.sellerId,
        buyerName: o.buyerName,
        buyerEmail: o.buyerEmail,
        item: item ? { id: item.id, title: item.title, image: item.image, price: item.price, quantity: item.quantity } : null,
        createdAt: o.createdAt,
        payId,
    });
}

/** Guest cancels their own unpaid hold from the order page (frees the item straight away). */
export async function cancelGuestOrderByToken(token: string) {
    const doc = await findOrderByToken(token);
    if (!doc) throw new Error('Order not found.');
    const o = doc.data() as any;
    if (o.status !== 'awaiting_payment') throw new Error('This order can no longer be cancelled here.');
    const { applyOrderTransition } = await import('@/lib/payments/server');
    await applyOrderTransition(doc.id, 'cancel', null, 'cancelled_by_buyer');
    return { success: true };
}
