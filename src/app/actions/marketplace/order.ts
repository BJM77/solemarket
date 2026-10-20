
'use server'

import { resolveSellerName } from '@/lib/utils/seller-name';
import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { FieldValue, QueryDocumentSnapshot, Timestamp } from 'firebase-admin/firestore';
import type { Product } from '@/lib/types';
import { serializeFirestoreData } from "@/lib/utils/serialization";
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateShipping, calculateTax } from '@/lib/pricing';
import { buildOrderPricing, parseDealId } from '@/lib/order-pricing';
import { DEFAULT_TIER_SETTINGS, normalizeTierSettings } from '@/lib/tier-bundles';
import { assertCheckoutPaymentAllowed, generatePaymentReference, normalizePaymentMethod, paymentDueAt } from '@/lib/payments/local';
import type { Deal } from '@/types/deals';
import type { FixedPriceBundle } from '@/types/bundles';
import { sendTelegramNotification } from '@/lib/telegram';

interface CartItem {
    id: string;
    quantity: number;
    dealId?: string;
    /** IGNORED by the server: deal/bundle prices are always loaded from Firestore. */
    bundlePrice?: number;
}

interface OrderOptions {
    shippingMethod: 'pickup' | 'shipping';
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    /** 'payid' | 'cash' (legacy labels like 'EFT / PayID Escrow' are mapped). Card is disabled. */
    paymentMethod?: 'payid' | 'cash' | 'Card' | 'PayID Escrow' | 'EFT / PayID Escrow' | 'Cash on Delivery';
    /** Buyer confirmed they can collect in person in Perth (required for cash). */
    perthPickupConfirmed?: boolean;
    idempotencyKey?: string;
    discountCode?: string;
}

export async function createOrderAction(items: CartItem[], idToken: string, options?: OrderOptions) {
    if (!items || items.length === 0) {
        return { error: 'Your cart is empty.' };
    }

    const idempotencyKey = options?.idempotencyKey;
    if (idempotencyKey) {
        const opRef = firestoreDb.collection('processed_operations').doc(idempotencyKey);
        const opSnap = await opRef.get();
        if (opSnap.exists) {
            console.log(`Idempotent request detected for key: ${idempotencyKey}`);
            return opSnap.data()?.result;
        }
    }

    try {
        const { uid: buyerId, email: buyerEmail, name: buyerName } = await ensureActionAuth(idToken);

        const results = await firestoreDb.runTransaction(async (t: any) => {
            const now = new Date();
            // ---------- READS (all reads must happen before any transaction write) ----------
            const productRefs = items.map(item => firestoreDb.collection('products').doc(String(item.id)));
            const productDocs = await t.getAll(...productRefs);

            const products: Product[] = productDocs.map((doc: any, i: number) => {
                if (!doc.exists) throw new Error(`Product ${items[i].id} not found.`);
                return { ...(doc.data() as Product), id: doc.id };
            });

            const sellerIds = Array.from(new Set(products.map(p => p.sellerId).filter(Boolean)));
            const fetchedUsers: Record<string, any> = {};
            if (sellerIds.length) {
                const sellerProfilesDocs = await t.getAll(...sellerIds.map(id => firestoreDb.collection('users').doc(id)));
                sellerProfilesDocs.forEach((doc: any) => {
                    if (doc.exists) fetchedUsers[doc.id] = doc.data();
                });
            }

            // Seller PayID details (private subcollection, never public).
            const payoutDocs: Record<string, any> = {};
            if (sellerIds.length) {
                const docs = await t.getAll(...sellerIds.map(id => firestoreDb.collection('users').doc(id).collection('private').doc('payout')));
                docs.forEach((doc: any, k: number) => { payoutDocs[sellerIds[k]] = doc.exists ? doc.data() : null; });
            }

            // Deals referenced by the cart: loaded from Firestore, never trusted from the client.
            const dealIds = Array.from(new Set(items.filter(i => i.dealId).map(i => parseDealId(String(i.dealId)))));
            const deals: Record<string, Deal | null> = {};
            if (dealIds.length) {
                const dealDocs = await t.getAll(...dealIds.map(id => firestoreDb.collection('deals').doc(id)));
                dealDocs.forEach((doc: any, k: number) => {
                    deals[dealIds[k]] = doc.exists ? ({ id: doc.id, ...doc.data() } as Deal) : null;
                });
            }

            // Fixed-price bundles for the sellers in the cart.
            const bundles: FixedPriceBundle[] = [];
            for (let k = 0; k < sellerIds.length; k += 30) {
                const snap = await t.get(firestoreDb.collection('bundles').where('sellerId', 'in', sellerIds.slice(k, k + 30)));
                snap.docs.forEach((doc: any) => bundles.push({ id: doc.id, ...doc.data() } as FixedPriceBundle));
            }

            // Bronze/Silver/Gold tier settings (admin-controlled, never from the client).
            const tierDoc = await t.get(firestoreDb.collection('settings').doc('multibuy_tiers'));
            const tierSettings = tierDoc.exists ? normalizeTierSettings(tierDoc.data()) : DEFAULT_TIER_SETTINGS;

            // Per-customer usage counters (promo_usage/{kind}_{id}_{buyerId}).
            const usageRef = (kind: 'deal' | 'bundle', id: string) =>
                firestoreDb.collection('promo_usage').doc(`${kind}_${id}_${buyerId}`);
            const limited: { kind: 'deal' | 'bundle'; id: string; max: number }[] = [
                ...dealIds.filter(id => deals[id]?.maxPerCustomer).map(id => ({ kind: 'deal' as const, id, max: Number(deals[id]!.maxPerCustomer) })),
                ...bundles.filter(b => b.maxPerCustomer).map(b => ({ kind: 'bundle' as const, id: b.id, max: Number(b.maxPerCustomer) })),
            ];
            const dealAllowance: Record<string, number> = {};
            const bundleAllowance: Record<string, number> = {};
            if (limited.length) {
                const usageDocs = await t.getAll(...limited.map(l => usageRef(l.kind, l.id)));
                usageDocs.forEach((doc: any, k: number) => {
                    const l = limited[k];
                    const used = doc.exists ? Number(doc.data()?.count || 0) : 0;
                    (l.kind === 'deal' ? dealAllowance : bundleAllowance)[l.id] = Math.max(0, l.max - used);
                });
            }

            // ---------- VALIDATION + PRICING (pure, see src/lib/order-pricing.ts) ----------
            for (let i = 0; i < items.length; i++) {
                const product = products[i];
                const item = items[i];
                if (!Number.isInteger(item.quantity) || item.quantity < 1) {
                    throw new Error('Invalid item quantity.');
                }
                if (product.status !== 'available') {
                    throw new Error(`${product.title} is no longer available.`);
                }
                if ((product.quantity || 0) < item.quantity) {
                    throw new Error(`Not enough stock for ${product.title}.`);
                }
                const currentHoldExpiresAt = product.holdExpiresAt?.toDate?.();
                const isCurrentlyHeld = currentHoldExpiresAt && currentHoldExpiresAt > now;
                if (isCurrentlyHeld && product.heldBy !== buyerId) {
                    throw new Error(`Sorry, ${product.title} is currently reserved by another buyer.`);
                }
            }

            const paymentMethod = normalizePaymentMethod(options?.paymentMethod ?? 'payid');
            if (!paymentMethod) {
                throw new Error('Card payments are not available yet. Please pay by PayID or cash on pickup.');
            }
            const shippingMethod = options?.shippingMethod || 'pickup';
            assertCheckoutPaymentAllowed({
                method: paymentMethod,
                shippingMethod,
                perthPickupConfirmed: options?.perthPickupConfirmed,
                sellers: sellerIds.map(id => ({
                    sellerId: id,
                    sellerName: resolveSellerName(fetchedUsers[id], products.find(p => p.sellerId === id)?.sellerName),
                    payIdReady: !!payoutDocs[id]?.payId,
                })),
            });
            const dueAt = paymentDueAt(paymentMethod, now);

            const { lineTotals, dealUsage, bundleUsage } = buildOrderPricing({
                items, products, deals, bundles, dealAllowance, bundleAllowance, tierSettings, now,
            });

            // ---------- WRITES ----------
            const sellerGroups: Record<string, { items: any[], subtotal: number, sellerName: string }> = {};
            for (let i = 0; i < items.length; i++) {
                const product = products[i];
                const item = items[i];
                const sellerId = product.sellerId;
                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = { items: [], subtotal: 0, sellerName: resolveSellerName(fetchedUsers[sellerId], product.sellerName) };
                }
                const itemTotal = lineTotals[i];
                sellerGroups[sellerId].items.push({
                    id: item.id,
                    title: product.title,
                    price: product.price,
                    discountedPrice: Math.round((itemTotal / item.quantity) * 100) / 100,
                    lineTotal: itemTotal,
                    quantity: item.quantity,
                    image: product.imageUrls?.[0] || '',
                    sellerId: product.sellerId,
                    dealId: item.dealId ? parseDealId(String(item.dealId)) : null,
                });
                sellerGroups[sellerId].subtotal = Math.round((sellerGroups[sellerId].subtotal + itemTotal) * 100) / 100;

                // Reserve (not sell) while awaiting payment; the release-unpaid-orders cron
                // puts it back if the buyer doesn't pay in time.
                const soldOut = (product.quantity || 0) - item.quantity === 0;
                t.update(productRefs[i], {
                    quantity: FieldValue.increment(-item.quantity),
                    ...(soldOut ? {
                        status: 'reserved',
                        reservedBy: buyerId,
                        reservedUntil: Timestamp.fromDate(dueAt),
                        updatedAt: FieldValue.serverTimestamp(),
                    } : {}),
                });
            }

            for (const [dealId, count] of Object.entries(dealUsage)) {
                t.update(firestoreDb.collection('deals').doc(dealId), { timesUsed: FieldValue.increment(count) });
                t.set(usageRef('deal', dealId), { count: FieldValue.increment(count), buyerId, kind: 'deal', refId: dealId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            for (const [bundleId, count] of Object.entries(bundleUsage)) {
                t.update(firestoreDb.collection('bundles').doc(bundleId), { timesUsed: FieldValue.increment(count) });
                t.set(usageRef('bundle', bundleId), { count: FieldValue.increment(count), buyerId, kind: 'bundle', refId: bundleId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }

            const settings = await getSystemSettingsAdmin();
            const groupOrderId = `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const createdOrders = [];

            const totalSubtotal = Object.values(sellerGroups).reduce((sum, g) => sum + g.subtotal, 0);

            // Fetch and validate discount code inside transaction
            let discountAmount = 0;
            let discountInfo = null;
            if (options?.discountCode) {
                const { validateDiscountCode } = await import('./discounts');
                const discountRes = await validateDiscountCode(options.discountCode, totalSubtotal);
                if (discountRes.success && discountRes.discountAmount) {
                    discountAmount = discountRes.discountAmount;
                    discountInfo = discountRes.discountInfo;
                    
                    const discountRef = firestoreDb.collection('discounts').doc(options.discountCode.trim().toUpperCase());
                    t.update(discountRef, {
                        usedCount: FieldValue.increment(1)
                    });
                }
            }

            for (const [sellerId, group] of Object.entries(sellerGroups)) {
                const orderRef = firestoreDb.collection('orders').doc();
                const sellerProfile = fetchedUsers[sellerId];
                const isBusiness = sellerProfile?.role === 'business';

                const shippingCost = calculateShipping(
                    group.subtotal,
                    options?.shippingMethod || 'pickup',
                    {
                        freightCharge: settings.freightCharge,
                        freeShippingThreshold: settings.freeShippingThreshold
                    }
                );

                const taxAmount = isBusiness 
                    ? calculateTax(group.subtotal, settings.standardTaxRate, true) 
                    : 0;
                
                const sellerShare = totalSubtotal > 0 ? (group.subtotal / totalSubtotal) : 0;
                const sellerDiscount = Number((discountAmount * sellerShare).toFixed(2));
                const totalAmount = Math.max(0, group.subtotal + shippingCost - sellerDiscount);
                const sellerPaypalLink = sellerProfile?.paypalMeLink || null;
                const paymentReference = generatePaymentReference();

                const newOrder = {
                    groupOrderId,
                    items: group.items,
                    totalAmount,
                    subtotal: group.subtotal,
                    shippingCost,
                    taxAmount,
                    discountAmount: sellerDiscount,
                    discountCode: options?.discountCode || null,
                    buyerId,
                    buyerEmail,
                    buyerName: buyerName || buyerEmail,
                    sellerId,
                    sellerName: group.sellerName,
                    isBusinessSeller: isBusiness,
                    status: 'awaiting_payment',
                    paymentStatus: 'pending',
                    paymentMethod,
                    paymentReference,
                    paymentDueAt: Timestamp.fromDate(dueAt),
                    pickupLocation: paymentMethod === 'cash' ? 'Perth (arranged with seller)' : null,
                    shippingMethod,
                    shippingAddress: options?.shippingAddress || null,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    sellerPaypalMeLink: sellerPaypalLink,
                    payIdReference: paymentReference, // legacy field name used by admin screens
                    nudgeCount: 0,
                    lastNudgeAt: null,
                };

                t.set(orderRef, newOrder);
                if (paymentMethod === 'payid') {
                    // Snapshot of the seller's PayID for this order. Server-only (rules deny clients);
                    // revealed to the buyer by getOrderPaymentDetails().
                    const payout = payoutDocs[sellerId];
                    t.set(orderRef.collection('private').doc('payment'), {
                        payId: payout.payId,
                        payIdType: payout.payIdType || null,
                        accountName: payout.accountName || null,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                }
                createdOrders.push({ id: orderRef.id, ...newOrder });
            }

            return createdOrders;
        });

        const serializedOrders = results.map((order: any) => serializeFirestoreData({
            ...order,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        const result = { orders: serializedOrders };

        // Buyer + seller notifications / emails with payment or pickup instructions.
        try {
            const { notifyOrderPlaced } = await import('@/lib/payments/server');
            await Promise.all(results.map((o: any) => notifyOrderPlaced(o)));
        } catch (e) {
            console.error('notifyOrderPlaced failed', e);
        }

        // Save result for idempotency
        if (idempotencyKey) {
            await firestoreDb.collection('processed_operations').doc(idempotencyKey).set({
                result,
                timestamp: FieldValue.serverTimestamp()
            });
        }

        try {
            const totalAmount = results.reduce((acc: number, order: any) => acc + order.totalAmount, 0);
            const itemsCount = items.reduce((acc, item) => acc + item.quantity, 0);
            const sellerNames = results.map((order: any) => order.sellerName).join(', ');

            await sendTelegramNotification(
                `<b>💰 New Order Received!</b>\n\n` +
                `<b>Order ID:</b> ${results[0].groupOrderId}\n` +
                `<b>Buyer:</b> ${buyerName || buyerEmail}\n` +
                `<b>Sellers:</b> ${sellerNames}\n` +
                `<b>Items:</b> ${itemsCount}\n` +
                `<b>Total:</b> $${totalAmount.toFixed(2)}\n\n` +
                `<a href="https://benched.au/admin/orders">View in Admin Dashboard</a>`
            );
        } catch (tgError) {
            console.error('Failed to send Telegram notification:', tgError);
        }

        return result;

    } catch (error: any) {
        console.error('Order creation failed:', error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}

export async function updateOrderStatus(idToken: string, orderId: string, status: string, trackingInfo?: { carrier: string, trackingNumber: string }) {
    try {
        const decodedToken = await ensureActionAuth(idToken);
        const { uid: userId } = decodedToken;

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) throw new Error("Order not found.");
        const orderData = orderSnap.data();

        const isOwner = orderData?.sellerId === userId;
        const isStaff = ['admin', 'superadmin'].includes(decodedToken.role);

        if (!isOwner && !isStaff) {
            throw new Error("Forbidden: You do not have permission to update this order.");
        }

        // Payment-state changes go through markOrderPaid / markOrderCollected / cancelUnpaidOrder
        // (order-payments.ts) so reserved listings are sold or released correctly.
        const ALLOWED = ['processing', 'shipped', 'delivered', 'cancelled'];
        if (!ALLOWED.includes(status)) {
            throw new Error('Unsupported status change.');
        }
        if (orderData?.status === 'awaiting_payment') {
            throw new Error('Use "Mark as paid", "Mark collected" or "Cancel" for unpaid orders.');
        }

        const updates: any = {
            status,
            updatedAt: FieldValue.serverTimestamp(),
        };

        if (trackingInfo) {
            updates.shippingCarrier = trackingInfo.carrier;
            updates.trackingNumber = trackingInfo.trackingNumber;
        }

        await orderRef.update(updates);
        return { success: true, message: `Order marked as ${status}.` };
    } catch (error: any) {
        console.error("Update order status failed:", error);
        return { success: false, message: error.message || "Failed to update order." };
    }
}

export async function confirmOrderReceipt(idToken: string, orderId: string) {
    try {
        const decodedToken = await ensureActionAuth(idToken);
        const { uid: userId } = decodedToken;

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) throw new Error("Order not found.");
        const orderData = orderSnap.data();

        if (orderData?.buyerId !== userId) {
            throw new Error("Unauthorized access. Only the buyer can confirm receipt.");
        }

        if (!['processing', 'paid', 'shipped'].includes(orderData?.status)) {
            throw new Error("Order cannot be confirmed at this stage.");
        }

        await orderRef.update({
            status: 'delivered',
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, message: "Order confirmed successfully." };
    } catch (error: any) {
        console.error("Confirm order receipt failed:", error);
        return { success: false, message: error.message || "Failed to confirm receipt." };
    }
}
