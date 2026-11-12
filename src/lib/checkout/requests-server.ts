/**
 * Seller-approved purchase requests: server side (Admin SDK + transactions only).
 * Pure rules live in ./requests.ts. Firestore rules deny all client writes to orders.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { resolveSellerName } from '@/lib/utils/seller-name';
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateShipping, calculateTax } from '@/lib/pricing';
import { generatePaymentReference } from '@/lib/payments/local';
import { sendNotification } from '@/services/notifications';
import { pushOrderToSeller, pushRequestToBuyer } from '@/lib/notifications/push-server';
import { SELLER_ORDERS_PATH } from '@/lib/notifications/push-payload';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { RESERVED_UNTIL_MS, addHold, assertCanHold, availableQuantity } from './holds';
import {
    MAX_OPEN_REQUESTS, REQUEST_TTL_MS, assertRequestLimit, countOpenRequestsForListing, countOpenUnits,
    NEEDS_PAYID_MESSAGE, effectiveRequestStatus, isRequestOrder, nextRequestState, planAcceptPayment, validateOfferAmount,
    type AcceptPaymentPlan, type RequestAction, type RequestType,
} from './requests';
import { randomId } from './guest-crypto';

const ORDERS = () => firestoreDb.collection('orders');
const OPEN_STATUSES = ['requested', 'countered', 'awaiting_payment'];
const money = (n: unknown) => `$${(Math.round(Number(n || 0) * 100) / 100).toFixed(2)}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Actor { uid: string; role?: string }
const isAdmin = (a?: Actor | null) => !!a && (a.role === 'admin' || a.role === 'superadmin');

/**
 * Open units (requests + accepted-but-unpaid + older running holds) for each identity field.
 * Two equality filters per query: served by single-field indexes (index merging), so no
 * composite index is needed.
 */
export async function countOpenByIdentity(ids: Record<string, string | null | undefined>, nowMs: number, t?: any) {
    const counts: Record<string, number> = {};
    for (const [field, value] of Object.entries(ids)) {
        if (!value) continue;
        const docs: any[] = [];
        for (const status of OPEN_STATUSES) {
            const q = ORDERS().where(field, '==', value).where('status', '==', status).limit(20);
            const snap = t ? await t.get(q) : await q.get();
            docs.push(...snap.docs.map((d: any) => d.data()));
        }
        counts[field] = countOpenUnits(docs, nowMs);
    }
    return counts;
}

export function assertRequestable(product: any, requestType: RequestType, buyerUid?: string | null) {
    if (!product) throw new Error('This listing no longer exists.');
    if (product.isDraft || product.isPrivate || product.status !== 'available') throw new Error(`${product.title || 'This item'} is no longer available.`);
    if (product.externalUrl) throw new Error('This item is sold on another site. Use the button on the listing.');
    if (product.isReverseBidding) throw new Error('This listing takes bids. Use the bidding panel on the listing.');
    if (requestType === 'buy' && product.isUntimed) throw new Error('This listing takes offers, not direct purchases.');
    if (requestType === 'offer' && !product.isNegotiable && !product.isUntimed) throw new Error("This seller isn't taking offers on this listing. You can still request to buy it.");
    if (buyerUid && buyerUid === product.sellerId) throw new Error("You can't buy your own listing.");
}

export async function priceRequest(unitPrice: number, qty: number, shippingMethod: 'pickup' | 'shipping') {
    const settings = await getSystemSettingsAdmin();
    const subtotal = round2(unitPrice * qty);
    const shippingCost = calculateShipping(subtotal, shippingMethod, { freightCharge: settings.freightCharge, freeShippingThreshold: settings.freeShippingThreshold });
    return { subtotal, shippingCost, totalAmount: Math.max(0, round2(subtotal + shippingCost)), standardTaxRate: settings.standardTaxRate };
}

export interface NewRequestInput {
    product: any;
    sellerProfile: any;
    requestType: RequestType;
    offerAmount?: number | null;
    paymentMethod: 'payid' | 'cash';
    shippingMethod: 'pickup' | 'shipping';
    shippingAddress: any;
    buyer: {
        buyerId: string | null;
        isGuest: boolean;
        name: string;
        email: string;
        phone?: string | null;
        hashes?: { email?: string | null; phone?: string | null; device?: string | null; ip?: string | null };
        accessTokenHash?: string | null;
    };
    nowMs: number;
}

/** The order document for a new single-listing request (no stock is touched). */
export async function buildRequestOrder(i: NewRequestInput) {
    const p = i.product;
    const asking = Number(p.price || 0);
    const unit = i.requestType === 'offer' ? Number(i.offerAmount) : asking;
    const q = await priceRequest(unit, 1, i.shippingMethod);
    const isBusiness = i.sellerProfile?.role === 'business';
    const paymentReference = generatePaymentReference();
    const sellerId = String(p.sellerId);
    return {
        groupOrderId: `GRP-${i.nowMs}-${randomId(4).toUpperCase()}`,
        items: [{
            id: p.id,
            title: p.title || 'Item',
            price: asking,
            discountedPrice: unit,
            lineTotal: q.subtotal,
            quantity: 1,
            image: p.imageUrls?.[0] || '',
            sellerId,
            dealId: null,
        }],
        productIds: [String(p.id)],
        totalAmount: q.totalAmount,
        subtotal: q.subtotal,
        shippingCost: q.shippingCost,
        taxAmount: isBusiness ? calculateTax(q.subtotal, q.standardTaxRate, true) : 0,
        discountAmount: 0,
        discountCode: null,
        buyerId: i.buyer.buyerId,
        isGuest: i.buyer.isGuest,
        buyerEmail: i.buyer.email,
        buyerName: i.buyer.name,
        buyerPhone: i.buyer.phone || null,
        ...(i.buyer.isGuest ? {
            guestEmailHash: i.buyer.hashes?.email || null,
            guestPhoneHash: i.buyer.hashes?.phone || null,
            guestDeviceHash: i.buyer.hashes?.device || null,
            guestIpHash: i.buyer.hashes?.ip || null,
            guestAccessTokenHash: i.buyer.accessTokenHash || null,
        } : {}),
        sellerId,
        sellerName: resolveSellerName(i.sellerProfile as any, p.sellerName),
        isBusinessSeller: isBusiness,
        status: 'requested',
        requestStatus: 'pending',
        stockMode: 'request',
        requestType: i.requestType,
        askingPrice: asking,
        offerAmount: i.requestType === 'offer' ? unit : null,
        counterAmount: null,
        agreedPrice: null,
        requestExpiresAt: Timestamp.fromMillis(i.nowMs + REQUEST_TTL_MS),
        counterExpiresAt: null,
        paymentStatus: 'pending',
        paymentMethod: i.paymentMethod,
        paymentReference,
        payIdReference: paymentReference,
        paymentDueAt: null,
        pickupLocation: i.paymentMethod === 'cash' ? 'Perth (arranged with seller)' : null,
        shippingMethod: i.shippingMethod,
        shippingAddress: i.shippingAddress || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        nudgeCount: 0,
        lastNudgeAt: null,
    };
}

/** Seller: in-app alert + push for a new request (best effort). */
export async function notifyNewRequest(order: any) {
    const isOffer = order.requestType === 'offer';
    const item = order.items?.[0]?.title || 'your item';
    const extra = (order.items?.length || 1) > 1 ? ` + ${(order.items.length - 1)} more` : '';
    try {
        await sendNotification(order.sellerId, 'sale', isOffer ? 'New offer' : 'New buy request',
            `${order.buyerName || 'A buyer'} ${isOffer ? `offered ${money(order.offerAmount)} for` : `wants to buy`} ${item}${extra} (${money(order.totalAmount)} incl. postage). Accept, decline${isOffer ? ' or counter' : ''} in your orders. It stays listed until you accept.`,
            SELLER_ORDERS_PATH);
    } catch (e) {
        console.error('notifyNewRequest in-app failed', e);
    }
    await pushOrderToSeller('new_request', order);
}

interface ReservePlan {
    productWrites: { ref: any; data: any }[];
    autoDecline: any[];
}

/**
 * Reads for reserving an order's items (must run before any transaction write): products, plus
 * every other request on the same listings so the last unit's other requests can be declined.
 */
async function readForReserve(t: any, order: any) {
    const qtyById = new Map<string, number>();
    for (const it of Array.isArray(order.items) ? order.items : []) {
        const id = String(it.id);
        qtyById.set(id, (qtyById.get(id) || 0) + Math.max(1, Number(it.quantity || 1)));
    }
    const ids = Array.from(qtyById.keys());
    const refs = ids.map((id) => firestoreDb.collection('products').doc(id));
    const docs = refs.length ? await t.getAll(...refs) : [];
    const others = new Map<string, any>();
    for (const id of ids) {
        const snap = await t.get(ORDERS().where('productIds', 'array-contains', id).limit(100));
        snap.docs.forEach((d: any) => others.set(d.id, d));
    }
    return { ids, qtyById, docs, others };
}

function planReserve(ctx: Awaited<ReturnType<typeof readForReserve>>, orderId: string, nowMs: number): ReservePlan {
    const productWrites: ReservePlan['productWrites'] = [];
    const soldOut = new Set<string>();
    ctx.docs.forEach((doc: any, k: number) => {
        if (!doc.exists) throw new Error('This listing no longer exists.');
        const p = { ...doc.data(), id: doc.id };
        const qty = ctx.qtyById.get(ctx.ids[k]) || 1;
        assertCanHold(p, qty, nowMs);
        const holds = addHold(p, { orderId, qty, expiresAtMs: RESERVED_UNTIL_MS, reserved: true }, nowMs);
        productWrites.push({ ref: doc.ref, data: { checkoutHolds: holds, updatedAt: FieldValue.serverTimestamp() } });
        if (availableQuantity({ ...p, checkoutHolds: holds }, nowMs) <= 0) soldOut.add(doc.id);
    });
    const autoDecline = Array.from(ctx.others.values()).filter((d: any) => {
        if (d.id === orderId) return false;
        const o = d.data();
        if (!isRequestOrder(o)) return false;
        const st = effectiveRequestStatus(o, nowMs);
        if (st !== 'pending' && st !== 'countered') return false;
        return (o.productIds || []).some((id: string) => soldOut.has(id));
    });
    return { productWrites, autoDecline };
}

function applyReserve(t: any, plan: ReservePlan) {
    plan.productWrites.forEach((w) => t.update(w.ref, w.data));
    plan.autoDecline.forEach((d: any) => t.update(d.ref, {
        status: 'declined',
        requestStatus: 'declined',
        declineReason: 'sold_to_another_buyer',
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
    }));
}

async function notifyAutoDeclined(docs: any[]) {
    for (const d of docs) {
        const o = { ...d.data(), id: d.id };
        try {
            if (o.buyerId) {
                await sendNotification(o.buyerId, 'system', 'Request declined', `${o.items?.[0]?.title || 'The item'} was reserved for another buyer, so your request was declined.`, '/profile/orders');
                await pushRequestToBuyer('request_declined', o);
            }
        } catch (e) {
            console.error('auto-decline notify failed', d.id, e);
        }
    }
}

/** Order patch fields for a newly agreed price (offers / counters), keeping postage rules. */
async function repriceSingle(order: any, unit: number) {
    const q = await priceRequest(unit, 1, order.shippingMethod === 'shipping' ? 'shipping' : 'pickup');
    const items = (order.items || []).map((it: any, k: number) => k === 0 ? { ...it, discountedPrice: unit, lineTotal: q.subtotal } : it);
    return {
        items,
        subtotal: q.subtotal,
        shippingCost: q.shippingCost,
        totalAmount: q.totalAmount,
        taxAmount: order.isBusinessSeller ? calculateTax(q.subtotal, q.standardTaxRate, true) : 0,
        agreedPrice: unit,
    };
}

/**
 * PayID for an order being accepted (transaction reads only). Guests can request from sellers
 * without a PayID; the seller's PayID is copied onto the order when it's accepted.
 */
async function readAcceptPayment(t: any, orderRef: any, order: any) {
    if (order?.paymentMethod !== 'payid') return { plan: 'keep' as AcceptPaymentPlan, payout: null as any };
    const [snapDoc, payoutDoc] = await t.getAll(
        orderRef.collection('private').doc('payment'),
        firestoreDb.collection('users').doc(String(order.sellerId)).collection('private').doc('payout'),
    );
    const payout = payoutDoc.exists ? payoutDoc.data() : null;
    return { plan: planAcceptPayment(order, snapDoc.exists && !!snapDoc.data()?.payId, !!payout?.payId), payout };
}

/** Writes for readAcceptPayment's plan (after all reads). Returns a patch for the order. */
function applyAcceptPayment(t: any, orderRef: any, r: Awaited<ReturnType<typeof readAcceptPayment>>): Record<string, unknown> {
    if (r.plan === 'needs_payid') throw new Error(NEEDS_PAYID_MESSAGE);
    if (r.plan === 'snapshot') {
        t.set(orderRef.collection('private').doc('payment'), {
            payId: r.payout.payId, payIdType: r.payout.payIdType || null, accountName: r.payout.accountName || null, createdAt: FieldValue.serverTimestamp(),
        });
    }
    if (r.plan === 'cash') return { paymentMethod: 'cash', pickupLocation: 'Perth (arranged with seller)' };
    return {};
}

/**
 * Seller answers a pending request: accept (reserve in a transaction), decline, or (offers)
 * decline with a counter-offer.
 */
export async function sellerRespondToRequest(orderId: string, actor: Actor, action: 'accept' | 'decline' | 'counter', counterAmount?: number) {
    const orderRef = ORDERS().doc(String(orderId));
    const result = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        const snap = await t.get(orderRef);
        if (!snap.exists) throw new Error('Request not found.');
        const order = snap.data();
        if (order.sellerId !== actor.uid && !isAdmin(actor)) throw new Error('Only the seller can answer this request.');
        if (!isRequestOrder(order)) throw new Error('This order is not a request.');

        if (action === 'accept') {
            const patch = nextRequestState(order, 'accept', nowMs);
            const pay = await readAcceptPayment(t, orderRef, order);
            const ctx = await readForReserve(t, order);
            const plan = planReserve(ctx, snap.id, nowMs);
            const agreed = order.requestType === 'offer' ? Number(order.offerAmount) : Number(order.items?.[0]?.discountedPrice ?? order.askingPrice);
            const payPatch = applyAcceptPayment(t, orderRef, pay);
            t.update(orderRef, {
                ...patch,
                ...payPatch,
                agreedPrice: order.requestType === 'offer' ? agreed : null,
                acceptedAt: FieldValue.serverTimestamp(),
                acceptedAtMs: nowMs,
                respondedAt: FieldValue.serverTimestamp(),
                statusUpdatedBy: actor.uid,
                updatedAt: FieldValue.serverTimestamp(),
            });
            applyReserve(t, plan);
            return { order: { ...order, ...payPatch, id: snap.id }, patch, autoDeclined: plan.autoDecline };
        }
        if (action === 'decline') {
            const patch = nextRequestState(order, 'decline', nowMs);
            t.update(orderRef, { ...patch, respondedAt: FieldValue.serverTimestamp(), statusUpdatedBy: actor.uid, updatedAt: FieldValue.serverTimestamp() });
            return { order: { ...order, id: snap.id }, patch, autoDeclined: [] };
        }
        // A counter can be accepted by the buyer straight away, so a posted order needs a PayID first.
        if ((await readAcceptPayment(t, orderRef, order)).plan === 'needs_payid') throw new Error(NEEDS_PAYID_MESSAGE);
        const patch = nextRequestState(order, 'counter', nowMs, { counterAmount, askingPrice: Number(order.askingPrice ?? order.items?.[0]?.price), offerAmount: Number(order.offerAmount) });
        const { counterExpiresAtMs, ...rest } = patch as any;
        t.update(orderRef, {
            ...rest,
            counterExpiresAt: Timestamp.fromMillis(counterExpiresAtMs),
            counteredAt: FieldValue.serverTimestamp(),
            respondedAt: FieldValue.serverTimestamp(),
            statusUpdatedBy: actor.uid,
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { order: { ...order, id: snap.id, counterAmount: rest.counterAmount }, patch, autoDeclined: [] };
    });

    // Buyer updates (in-app for signed-in buyers + push if they turned it on; guests see their order page).
    const o = result.order;
    const item = o.items?.[0]?.title || 'the item';
    try {
        if (o.buyerId) {
            if (action === 'accept') {
                await sendNotification(o.buyerId, 'system', 'Request accepted', `The seller accepted your request for ${item}. ${o.paymentMethod === 'cash' ? 'Message them to arrange pickup.' : 'Pay by PayID using the details on your order.'}`, '/profile/orders');
                await pushRequestToBuyer('request_accepted', o);
            } else if (action === 'decline') {
                await sendNotification(o.buyerId, 'system', 'Request declined', `The seller declined your request for ${item}.`, '/profile/orders');
                await pushRequestToBuyer('request_declined', o);
            } else {
                await sendNotification(o.buyerId, 'system', 'Counter-offer received', `The seller countered your offer for ${item} with ${money(o.counterAmount)}. Accept or decline within 24 hours.`, '/profile/orders');
                await pushRequestToBuyer('request_countered', o);
            }
        }
    } catch (e) {
        console.error('request response notify failed', e);
    }
    if (result.autoDeclined.length) await notifyAutoDeclined(result.autoDeclined);
    return result.patch;
}

/**
 * Buyer acts on their own request: accept / decline a counter, or cancel. The caller has
 * already authorised the buyer (uid match, or the guest's order token).
 */
export async function buyerRespondToRequest(orderId: string, action: 'accept_counter' | 'decline_counter' | 'buyer_cancel') {
    const orderRef = ORDERS().doc(String(orderId));
    const pre = await orderRef.get();
    if (!pre.exists) throw new Error('Request not found.');
    const preOrder = pre.data();
    const reprice = action === 'accept_counter' && preOrder?.counterAmount != null ? await repriceSingle(preOrder, Number(preOrder.counterAmount)) : null;

    // Cancelling an accepted request gives the stock back: reuse the order lifecycle.
    if (action === 'buyer_cancel' && preOrder?.status === 'awaiting_payment') {
        nextRequestState(preOrder, 'buyer_cancel');
        const { applyOrderTransition } = await import('@/lib/payments/server');
        await applyOrderTransition(orderId, 'cancel', null, 'cancelled_by_buyer');
        return { status: 'cancelled', requestStatus: 'cancelled' };
    }

    const result = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        const snap = await t.get(orderRef);
        if (!snap.exists) throw new Error('Request not found.');
        const order = snap.data();
        if (!isRequestOrder(order)) throw new Error('This order is not a request.');
        if (action === 'accept_counter') {
            const patch = nextRequestState(order, 'accept_counter', nowMs);
            if (Number(order.counterAmount) !== Number(preOrder?.counterAmount)) throw new Error('The counter-offer changed. Please reload and try again.');
            const pay = await readAcceptPayment(t, orderRef, order);
            const ctx = await readForReserve(t, order);
            const plan = planReserve(ctx, snap.id, nowMs);
            if (pay.plan === 'needs_payid') throw new Error("The seller hasn't set up PayID for posted orders yet. Please try again later or contact the seller.");
            const payPatch = applyAcceptPayment(t, orderRef, pay);
            t.update(orderRef, {
                ...patch,
                ...(reprice || {}),
                ...payPatch,
                acceptedAt: FieldValue.serverTimestamp(),
                acceptedAtMs: nowMs,
                counterRespondedAt: FieldValue.serverTimestamp(),
                statusUpdatedBy: 'buyer',
                updatedAt: FieldValue.serverTimestamp(),
            });
            applyReserve(t, plan);
            return { order: { ...order, ...payPatch, id: snap.id }, patch, autoDeclined: plan.autoDecline };
        }
        const patch = nextRequestState(order, action, nowMs) as any;
        const { releasesStock: _r, ...rest } = patch;
        t.update(orderRef, {
            ...rest,
            ...(action === 'buyer_cancel' ? { cancelledAt: FieldValue.serverTimestamp() } : { counterRespondedAt: FieldValue.serverTimestamp() }),
            statusUpdatedBy: 'buyer',
            updatedAt: FieldValue.serverTimestamp(),
        });
        return { order: { ...order, id: snap.id }, patch: rest, autoDeclined: [] };
    });

    const o = result.order;
    const item = o.items?.[0]?.title || 'your item';
    try {
        if (action === 'accept_counter') {
            await sendNotification(o.sellerId, 'sale', 'Counter-offer accepted', `${o.buyerName || 'The buyer'} accepted your counter of ${money(o.counterAmount)} for ${item}. It's reserved for them until you mark it paid or relist it.`, SELLER_ORDERS_PATH);
            await pushOrderToSeller('counter_accepted', o);
        } else if (action === 'decline_counter') {
            await sendNotification(o.sellerId, 'system', 'Counter-offer declined', `${o.buyerName || 'The buyer'} declined your counter-offer for ${item}.`, SELLER_ORDERS_PATH);
        } else {
            await sendNotification(o.sellerId, 'system', 'Request cancelled', `${o.buyerName || 'The buyer'} cancelled their request for ${item}.`, SELLER_ORDERS_PATH);
            await pushOrderToSeller('cancelled_by_buyer', o);
        }
    } catch (e) {
        console.error('buyer response notify failed', e);
    }
    if (result.autoDeclined.length) await notifyAutoDeclined(result.autoDeclined);
    return result.patch;
}

/** Seller relists an accepted request: cancels it ('seller_relisted') and frees the item. */
export async function relistAcceptedRequest(orderId: string, actor: Actor) {
    const snap = await ORDERS().doc(String(orderId)).get();
    if (!snap.exists) throw new Error('Order not found.');
    const o = snap.data();
    if (o.sellerId !== actor.uid && !isAdmin(actor)) throw new Error('Only the seller can relist this item.');
    nextRequestState(o, 'relist');
    const { applyOrderTransition } = await import('@/lib/payments/server');
    return applyOrderTransition(orderId, 'cancel', actor, 'seller_relisted');
}

/**
 * Scheduled tidy-up: pending requests older than 24h and counters older than 24h -> expired.
 * Lazy expiry already hides them everywhere; this just writes the status. No email.
 */
export async function expireStaleRequests(now: Date = new Date(), limit = 300) {
    const nowMs = now.getTime();
    const snap = await ORDERS().where('status', 'in', ['requested', 'countered']).limit(1000).get();
    const stale = snap.docs.filter((d: any) => effectiveRequestStatus(d.data(), nowMs) === 'expired').slice(0, limit);
    let expired = 0;
    for (const d of stale) {
        try {
            const done = await firestoreDb.runTransaction(async (t: any) => {
                const cur = await t.get(d.ref);
                if (!cur.exists) return false;
                const o = cur.data();
                if (effectiveRequestStatus(o, Date.now()) !== 'expired' || !['requested', 'countered'].includes(o.status)) return false;
                t.update(d.ref, { ...nextRequestState(o, 'expire', Date.now()), expiredFrom: o.status, expiredAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                return true;
            });
            if (done) expired++;
        } catch (e) {
            console.error('expire request failed', d.id, e);
        }
    }
    return { checked: snap.size, expired };
}

/** Public: how many open requests a listing has (a number only, no buyer details). */
export async function countListingRequests(productId: string) {
    if (!/^[\w-]{1,128}$/.test(String(productId || ''))) return 0;
    const snap = await ORDERS().where('productIds', 'array-contains', String(productId)).limit(100).get();
    return countOpenRequestsForListing(snap.docs.map((d: any) => d.data()));
}

export interface SignedInRequestInput {
    productId: string;
    requestType: RequestType;
    offerAmount?: number | null;
    paymentMethod?: 'payid' | 'cash';
    shippingMethod?: 'pickup' | 'shipping';
    shippingAddress?: { street?: string; city?: string; state?: string; zip?: string } | null;
    perthPickupConfirmed?: boolean;
}

/** Signed-in buyer sends a request (buy or offer) on one listing. */
export async function createSignedInRequest(buyer: { uid: string; email?: string | null; name?: string | null }, input: SignedInRequestInput) {
    const productId = String(input?.productId || '');
    if (!/^[\w-]{1,128}$/.test(productId)) throw new Error('Listing not found.');
    const requestType: RequestType = input?.requestType === 'offer' ? 'offer' : 'buy';
    const shippingMethod = input?.shippingMethod === 'shipping' ? 'shipping' : 'pickup';
    const paymentMethod = input?.paymentMethod === 'cash' ? 'cash' : 'payid';
    if (paymentMethod === 'cash') {
        if (shippingMethod !== 'pickup') throw new Error('Cash is only available for local pickup in Perth. Choose pickup or pay by PayID.');
        if (!input?.perthPickupConfirmed) throw new Error('Please confirm you can collect in person in Perth to pay cash.');
    }
    let shippingAddress: any = null;
    if (shippingMethod === 'shipping') {
        const { validateGuestDetails } = await import('./guest-validation');
        shippingAddress = validateGuestDetails({ name: 'Buyer', email: 'buyer@example.com', mobile: '0400000000', shippingMethod, shippingAddress: input?.shippingAddress || {} }).shippingAddress;
    }
    assertRequestLimit(await countOpenByIdentity({ buyerId: buyer.uid }, Date.now()), 1);
    const productRef = firestoreDb.collection('products').doc(productId);

    const order = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        const pSnap = await t.get(productRef);
        const product = pSnap.exists ? { ...pSnap.data(), id: pSnap.id } as any : null;
        assertRequestable(product, requestType, buyer.uid);
        const sellerId = String(product.sellerId);
        const [userDoc, payoutDoc] = await t.getAll(
            firestoreDb.collection('users').doc(sellerId),
            firestoreDb.collection('users').doc(sellerId).collection('private').doc('payout'),
        );
        const counts = await countOpenByIdentity({ buyerId: buyer.uid }, nowMs, t);
        assertRequestLimit(counts, 1);
        const payout = payoutDoc.exists ? payoutDoc.data() : null;
        if (paymentMethod === 'payid' && !payout?.payId) throw new Error("This seller doesn't take PayID yet. Choose cash on pickup in Perth.");
        const offerAmount = requestType === 'offer' ? validateOfferAmount(input?.offerAmount, product) : null;
        const orderRef = ORDERS().doc();
        const newOrder = await buildRequestOrder({
            product, sellerProfile: userDoc.exists ? userDoc.data() : null, requestType, offerAmount,
            paymentMethod, shippingMethod, shippingAddress,
            buyer: { buyerId: buyer.uid, isGuest: false, name: buyer.name || buyer.email || 'Buyer', email: buyer.email || '' },
            nowMs,
        });
        t.set(orderRef, newOrder);
        if (paymentMethod === 'payid') {
            t.set(orderRef.collection('private').doc('payment'), {
                payId: payout.payId, payIdType: payout.payIdType || null, accountName: payout.accountName || null, createdAt: FieldValue.serverTimestamp(),
            });
        }
        return { id: orderRef.id, ...newOrder };
    });
    await notifyNewRequest(order);
    return serializeFirestoreData({ id: order.id, status: order.status, requestType: order.requestType, totalAmount: order.totalAmount, paymentReference: order.paymentReference });
}

export { MAX_OPEN_REQUESTS };
export type { RequestAction };
