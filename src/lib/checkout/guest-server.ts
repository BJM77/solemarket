/**
 * Guest requests (no account, no email): name, email and mobile, then a Buy or Offer request
 * goes to the seller, who accepts, declines or counters. The buyer follows it on a private
 * order page (PayID shown once accepted). Fake requests are kept down by the 3-open-requests
 * limit per email/mobile/device/IP, rate limits, a honeypot and a minimum time on the form.
 * Server only: every write goes through the Admin SDK. Firestore rules deny clients access to
 * guest_checkout_tickets and to guest orders.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { validateGuestDetails, checkFormTiming, isHoneypotFilled, MIN_FORM_MS, type GuestDetailsInput, type GuestDetails } from './guest-validation';
import { generateOrderToken, identityHash, isPlausibleOrderToken, orderTokenHash, randomId } from './guest-crypto';
import { isActiveHoldOrder } from './holds';
import { assertRequestLimit, effectiveRequestStatus, isRequestOrder, validateOfferAmount } from './requests';
import { assertRequestable, buildRequestOrder, buyerRespondToRequest, countOpenByIdentity, notifyNewRequest } from './requests-server';

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

/** Open-request counts per identity (pending, countered, or accepted and not yet paid). */
async function countOpen(hashes: Hashes, nowMs: number, t?: any) {
    const ids: Record<string, string | null> = {};
    for (const key of Object.keys(HASH_FIELDS) as (keyof Hashes)[]) ids[HASH_FIELDS[key]] = hashes[key];
    return countOpenByIdentity(ids, nowMs, t);
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

export interface PlaceGuestRequestInput extends GuestDetailsInput {
    productId: string;
    ticketId: string;
    /** 'buy' (asking price) or 'offer' (below asking). */
    requestType?: 'buy' | 'offer';
    offerAmount?: number | null;
    /** Honeypot: hidden from people, bots fill it in. */
    website?: unknown;
}

/**
 * Guest sends a request (no account, no email): checks the form ticket, honeypot and the
 * 3-open-requests limit, then in one transaction re-checks the listing and limits and creates
 * the request (with the seller's PayID snapshot, only revealed once the seller accepts).
 * Nothing is held: the listing stays on sale until the seller accepts a request.
 */
export async function placeGuestRequest(input: PlaceGuestRequestInput, ctx: GuestContext) {
    if (isHoneypotFilled(input?.website)) throw new Error("We couldn't send this request. Please refresh the page and try again.");
    const details = validateGuestDetails(input);
    const requestType: 'buy' | 'offer' = input?.requestType === 'offer' ? 'offer' : 'buy';
    const productId = String(input?.productId || '');
    if (!/^[\w-]{1,128}$/.test(productId)) throw new Error('Listing not found.');
    const ticketId = String(input?.ticketId || '');
    if (!/^[\w-]{10,64}$/.test(ticketId)) throw new Error('This form has expired. Please close it and try again.');

    const ticketRef = firestoreDb.collection(TICKETS).doc(ticketId);
    const pre = await ticketRef.get();
    if (!pre.exists) throw new Error('This form has expired. Please close it and try again.');
    const ticket = pre.data() as any;
    if (ticket.used) throw new Error('This form was already used. Please close it and try again.');
    if (ticket.productId !== productId) throw new Error('This form has expired. Please close it and try again.');
    const timingError = checkFormTiming(Number(ticket.issuedAtMs), Date.now());
    if (timingError) throw new Error(timingError);

    const hashes = identityHashes(details, ctx);
    // Cheap pre-check outside the transaction (re-checked inside).
    assertRequestLimit(await countOpen(hashes, Date.now()), 1);

    const productRef = firestoreDb.collection('products').doc(productId);
    const { token, hash: tokenHash } = generateOrderToken();

    const order = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        // ---------- reads ----------
        const tk = await t.get(ticketRef);
        if (!tk.exists || tk.data().used) throw new Error('This form was already used. Please close it and try again.');
        const pSnap = await t.get(productRef);
        const product = pSnap.exists ? { ...pSnap.data(), id: pSnap.id } as any : null;
        assertRequestable(product, requestType, null);
        const sellerId = String(product.sellerId);
        const [userDoc, payoutDoc] = await t.getAll(
            firestoreDb.collection('users').doc(sellerId),
            firestoreDb.collection('users').doc(sellerId).collection('private').doc('payout'),
        );
        const counts = await countOpen(hashes, nowMs, t);

        // ---------- checks ----------
        assertRequestLimit(counts, 1);
        const payout = payoutDoc.exists ? payoutDoc.data() : null;
        if (!payout?.payId) throw new Error("This seller doesn't take PayID yet, so buying without an account isn't available. Sign in to arrange a cash pickup, or message the seller.");
        const offerAmount = requestType === 'offer' ? validateOfferAmount(input?.offerAmount, product) : null;

        const orderRef = firestoreDb.collection('orders').doc();
        const newOrder = await buildRequestOrder({
            product,
            sellerProfile: userDoc.exists ? userDoc.data() : null,
            requestType,
            offerAmount,
            paymentMethod: 'payid',
            shippingMethod: details.shippingMethod,
            shippingAddress: details.shippingAddress,
            buyer: {
                buyerId: null,
                isGuest: true,
                name: details.name,
                email: details.email,
                phone: details.mobile,
                hashes,
                accessTokenHash: tokenHash,
            },
            nowMs,
        });

        // ---------- writes ----------
        t.update(ticketRef, { used: true, usedAt: FieldValue.serverTimestamp(), orderId: orderRef.id });
        t.set(orderRef, newOrder);
        t.set(orderRef.collection('private').doc('payment'), {
            payId: payout.payId,
            payIdType: payout.payIdType || null,
            accountName: payout.accountName || null,
            createdAt: FieldValue.serverTimestamp(),
        });
        return { id: orderRef.id, ...newOrder };
    });

    // Seller: in-app notification + push to their phone/computer. No email to anyone.
    await notifyNewRequest(order);
    try {
        const { sendTelegramNotification } = await import('@/lib/telegram');
        await sendTelegramNotification(`<b>🛒 Guest ${requestType === 'offer' ? 'offer' : 'buy request'}</b>\n<b>Item:</b> ${order.items[0].title}\n<b>Total:</b> $${Number(order.totalAmount).toFixed(2)}\n<b>Seller:</b> ${order.sellerName}`);
    } catch { /* best effort */ }

    return {
        orderToken: token,
        orderId: order.id,
        paymentReference: order.paymentReference,
        totalAmount: order.totalAmount,
        requestType,
        title: order.items[0].title,
    };
}

async function findOrderByToken(token: string) {
    if (!isPlausibleOrderToken(token)) return null;
    const snap = await firestoreDb.collection('orders').where('guestAccessTokenHash', '==', orderTokenHash(token)).limit(1).get();
    return snap.empty ? null : snap.docs[0];
}

/**
 * The guest's order page. Only this order's own fields, plus the seller's PayID once the seller
 * has accepted (or, for older orders, while the 30-minute hold runs). Expired holds and
 * unanswered requests are tidied up lazily here.
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
    const isRequest = isRequestOrder(o);
    const requestStatus = isRequest ? effectiveRequestStatus(o, nowMs) : null;
    const active = isRequest ? o.status === 'awaiting_payment' : isActiveHoldOrder(o, nowMs);
    let payId: { payId: string; payIdType: string | null; accountName: string | null } | null = null;
    if (o.paymentMethod === 'payid' && o.status === 'awaiting_payment' && active) {
        const p = await doc!.ref.collection('private').doc('payment').get();
        if (p.exists) payId = { payId: p.data()!.payId, payIdType: p.data()!.payIdType || null, accountName: p.data()!.accountName || null };
    }
    const item = Array.isArray(o.items) ? o.items[0] : null;
    return serializeFirestoreData({
        id: doc!.id,
        status: o.status,
        stockMode: o.stockMode || null,
        requestStatus,
        requestType: o.requestType || null,
        askingPrice: o.askingPrice ?? null,
        offerAmount: o.offerAmount ?? null,
        counterAmount: o.counterAmount ?? null,
        agreedPrice: o.agreedPrice ?? null,
        requestExpiresAt: o.requestExpiresAt || null,
        counterExpiresAt: o.counterExpiresAt || null,
        acceptedAt: o.acceptedAt || null,
        declineReason: o.declineReason || null,
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

/** Guest cancels their own request or unpaid order from the order page. */
export async function cancelGuestOrderByToken(token: string) {
    const doc = await findOrderByToken(token);
    if (!doc) throw new Error('Order not found.');
    const o = doc.data() as any;
    if (isRequestOrder(o)) {
        await buyerRespondToRequest(doc.id, 'buyer_cancel');
        return { success: true };
    }
    if (o.status !== 'awaiting_payment') throw new Error('This order can no longer be cancelled here.');
    const { applyOrderTransition } = await import('@/lib/payments/server');
    await applyOrderTransition(doc.id, 'cancel', null, 'cancelled_by_buyer');
    return { success: true };
}

/** Guest accepts or declines the seller's counter-offer from the order page. */
export async function respondToCounterByToken(token: string, accept: boolean) {
    const doc = await findOrderByToken(token);
    if (!doc) throw new Error('Order not found.');
    if (!isRequestOrder(doc.data())) throw new Error('This order has no counter-offer.');
    await buyerRespondToRequest(doc.id, accept ? 'accept_counter' : 'decline_counter');
    return { success: true };
}
