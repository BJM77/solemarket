/**
 * Guest checkout (no account): verify the email with a 6-digit code, then hold the item for
 * 30 minutes and show the seller's PayID. Server only: every write goes through the Admin SDK.
 * Firestore rules deny clients access to guest_checkout_codes and to guest orders.
 */
import { firestoreDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { resolveSellerName } from '@/lib/utils/seller-name';
import { serializeFirestoreData } from '@/lib/utils/serialization';
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateShipping, calculateTax } from '@/lib/pricing';
import { generatePaymentReference } from '@/lib/payments/local';
import { validateGuestDetails, isSixDigitCode, type GuestDetailsInput, type GuestDetails } from './guest-validation';
import { CODE_TTL_MS, MAX_CODE_ATTEMPTS, codeMatches, generateCode, generateOrderToken, hashCode, identityHash, isPlausibleOrderToken, orderTokenHash, randomId } from './guest-crypto';
import { addHold, assertCanHold, assertHoldLimits, countActiveHoldOrders, holdExpiry, isActiveHoldOrder, toMs, HOLD_MINUTES } from './holds';

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
const CODES = 'guest_checkout_codes';

/** Emulator-only test hook: the e2e flow reads the code from Firestore. Never true in production. */
function isEmulatorTestEnv(): boolean {
    const project = process.env.GCLOUD_PROJECT || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';
    return process.env.NEXT_PUBLIC_E2E_EMULATORS === 'true' && !!process.env.FIRESTORE_EMULATOR_HOST && project.startsWith('demo-');
}

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

async function loadSellerForCheckout(sellerId: string) {
    const [userDoc, payoutDoc] = await firestoreDb.getAll(
        firestoreDb.collection('users').doc(sellerId),
        firestoreDb.collection('users').doc(sellerId).collection('private').doc('payout'),
    );
    return { user: userDoc.exists ? userDoc.data() : null, payout: payoutDoc.exists ? payoutDoc.data() : null };
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
 * Step 1: validate details, check the item can be held, check limits, email a 6-digit code.
 * Returns a challenge id (not secret on its own: the code is needed too).
 */
export async function requestGuestCheckoutCode(
    input: GuestDetailsInput & { productId: string },
    ctx: GuestContext,
    deps: { sendCode: (to: string, name: string, code: string, title: string) => Promise<{ success: boolean; error?: string }>; emailConfigured: () => boolean },
) {
    const details = validateGuestDetails(input);
    const productId = String(input.productId || '');
    if (!/^[\w-]{1,128}$/.test(productId)) throw new Error('Listing not found.');

    const snap = await firestoreDb.collection('products').doc(productId).get();
    const product = snap.exists ? { ...snap.data(), id: snap.id } as any : null;
    assertGuestBuyable(product);
    const nowMs = Date.now();
    assertCanHold(product, 1, nowMs);

    const seller = await loadSellerForCheckout(String(product.sellerId));
    if (!seller.payout?.payId) {
        throw new Error("This seller doesn't take PayID yet, so guest checkout isn't available. Sign in to arrange a cash pickup, or message the seller.");
    }

    const hashes = identityHashes(details, ctx);
    assertHoldLimits(await countHolds(hashes, nowMs));

    const testEnv = isEmulatorTestEnv();
    if (!deps.emailConfigured() && !testEnv) {
        throw new Error("We can't send checkout codes right now. Please sign in to buy, or try again later.");
    }

    const code = generateCode();
    const challengeId = randomId(18);
    const q = await quote(product, details.shippingMethod);
    await firestoreDb.collection(CODES).doc(challengeId).set({
        codeHash: hashCode(challengeId, code),
        attempts: 0,
        used: false,
        productId,
        details,
        hashes,
        expiresAt: Timestamp.fromMillis(nowMs + CODE_TTL_MS),
        // TTL policy field (optional, free): lets Firestore delete old challenges.
        expireAt: Timestamp.fromMillis(nowMs + 24 * 3600_000),
        createdAt: FieldValue.serverTimestamp(),
        ...(testEnv ? { devCode: code } : {}),
    });

    if (deps.emailConfigured()) {
        const sent = await deps.sendCode(details.email, details.name, code, String(product.title || 'your item'));
        if (!sent.success) {
            await firestoreDb.collection(CODES).doc(challengeId).delete().catch(() => {});
            throw new Error("We couldn't email your code. Check the address, or sign in to buy instead.");
        }
    }

    return { challengeId, email: details.email, totalAmount: q.totalAmount, shippingCost: q.shippingCost, holdMinutes: HOLD_MINUTES };
}

/**
 * Step 2: check the code, then in one transaction re-check the item and limits, create the
 * order (with the seller's PayID snapshot) and add a 30-minute hold to the listing.
 * Two buyers racing for the last unit: Firestore retries the loser's transaction, which
 * then sees the winner's hold and fails with "on hold for another buyer".
 */
export async function confirmGuestCheckout(input: { challengeId: string; code: string }, ctx: GuestContext) {
    const challengeId = String(input.challengeId || '');
    if (!/^[\w-]{10,64}$/.test(challengeId)) throw new Error('Your code has expired. Request a new one.');
    const code = String(input.code || '').trim();
    if (!isSixDigitCode(code)) throw new Error('Enter the 6-digit code from your email.');

    const challengeRef = firestoreDb.collection(CODES).doc(challengeId);
    const pre = await challengeRef.get();
    if (!pre.exists) throw new Error('Your code has expired. Request a new one.');
    const c = pre.data() as any;
    if (c.used) throw new Error('This code has already been used.');
    if ((toMs(c.expiresAt) || 0) <= Date.now()) throw new Error('Your code has expired. Request a new one.');
    if (Number(c.attempts || 0) >= MAX_CODE_ATTEMPTS) throw new Error('Too many wrong codes. Request a new one.');
    if (!codeMatches(challengeId, code, c.codeHash)) {
        await challengeRef.update({ attempts: FieldValue.increment(1) });
        const left = MAX_CODE_ATTEMPTS - Number(c.attempts || 0) - 1;
        throw new Error(left > 0 ? `That code isn't right. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong codes. Request a new one.');
    }

    const details: GuestDetails = c.details;
    // Limits are re-checked against the device/IP of the confirming request too.
    const hashes: Hashes = { ...c.hashes, ...Object.fromEntries(Object.entries(identityHashes(details, ctx)).filter(([k, v]) => (k === 'device' || k === 'ip') && v)) };
    const productRef = firestoreDb.collection('products').doc(String(c.productId));
    const { token, hash: tokenHash } = generateOrderToken();

    const order = await firestoreDb.runTransaction(async (t: any) => {
        const nowMs = Date.now();
        // ---------- reads ----------
        const ch = await t.get(challengeRef);
        if (!ch.exists || ch.data().used) throw new Error('This code has already been used.');
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
        if (!payout?.payId) throw new Error("This seller doesn't take PayID yet. Sign in to arrange a cash pickup.");

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
        t.update(challengeRef, { used: true, usedAt: FieldValue.serverTimestamp(), orderId: orderRef.id, devCode: FieldValue.delete() });
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

    const orderUrl = `${SITE}/order/${token}`;
    try {
        const { notifyOrderPlaced } = await import('@/lib/payments/server');
        await notifyOrderPlaced(order, { orderUrl });
    } catch (e) {
        console.error('guest notifyOrderPlaced failed', e);
    }
    try {
        const { sendTelegramNotification } = await import('@/lib/telegram');
        await sendTelegramNotification(`<b>🛒 Guest order (PayID, 30 min hold)</b>\n<b>Item:</b> ${order.items[0].title}\n<b>Total:</b> $${Number(order.totalAmount).toFixed(2)}\n<b>Seller:</b> ${order.sellerName}`);
    } catch { /* best effort */ }

    return { orderToken: token, orderId: order.id };
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
