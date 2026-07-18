
'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { Product } from '@/lib/types';
import { serializeFirestoreData } from '@/lib/utils';
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateItemTotal, calculateShipping, calculateTax, calculateDutchAuctionPrice } from '@/lib/pricing';
import { sendTelegramNotification } from '@/lib/telegram';

interface CartItem {
    id: string;
    quantity: number;
    dealId?: string;
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
    paymentMethod?: 'Card' | 'PayID Escrow';
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
            const productRefs = items.map(item => firestoreDb.collection('products').doc(item.id));
            const productDocs = await t.getAll(...productRefs);

            const sellerGroups: Record<string, { items: any[], subtotal: number, sellerName: string }> = {};
            const sellerIds = new Set<string>();

            productDocs.forEach((doc: any) => {
                if (doc.exists) {
                    const product = doc.data() as Product;
                    if (product.sellerId) sellerIds.add(product.sellerId);
                }
            });

            const sellerProfilesRefs = Array.from(sellerIds).map(id => firestoreDb.collection('users').doc(id));
            const sellerProfilesDocs = await t.getAll(...sellerProfilesRefs);
            const fetchedUsers: Record<string, any> = {};
            sellerProfilesDocs.forEach((doc: any) => {
                if (doc.exists) fetchedUsers[doc.id] = doc.data();
            });

            for (let i = 0; i < items.length; i++) {
                const doc = productDocs[i];
                const item = items[i];

                if (!doc.exists) throw new Error(`Product ${item.id} not found.`);
                const product = doc.data() as Product;

                if ((product.quantity || 0) < item.quantity) {
                    throw new Error(`Not enough stock for ${product.title}.`);
                }

                const now = new Date();
                const currentHoldExpiresAt = product.holdExpiresAt?.toDate();
                const isCurrentlyHeld = currentHoldExpiresAt && currentHoldExpiresAt > now;
                if (isCurrentlyHeld && product.heldBy !== buyerId) {
                    throw new Error(`Sorry, ${product.title} is currently reserved by another buyer.`);
                }

                const sellerId = product.sellerId;
                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = { items: [], subtotal: 0, sellerName: product.sellerName };
                }

                let effectiveQuantity = item.quantity;
                if (product.multibuyEnabled) {
                    effectiveQuantity = items.filter((i, idx) => {
                        const p = productDocs[idx].data() as Product;
                        return p.multibuyEnabled && p.sellerId === product.sellerId && p.category === product.category && !i.dealId;
                    }).reduce((sum, i) => sum + i.quantity, 0);
                }

                let basePrice = product.price;
                if (product.isDutchAuction && product.dutchAuctionStartTime && product.dutchAuctionDropAmount && product.dutchAuctionIntervalHours && product.dutchAuctionFloorPrice !== undefined) {
                    basePrice = calculateDutchAuctionPrice(
                        product.price,
                        product.dutchAuctionDropAmount,
                        product.dutchAuctionIntervalHours,
                        product.dutchAuctionFloorPrice,
                        product.dutchAuctionStartTime
                    );
                }

                const itemTotal = (item.dealId && item.bundlePrice !== undefined)
                    ? item.bundlePrice
                    : calculateItemTotal(basePrice, item.quantity, product.multibuyEnabled, product.multibuyTiers, effectiveQuantity);

                sellerGroups[sellerId].items.push({
                    id: item.id,
                    title: product.title,
                    price: product.price,
                    discountedPrice: itemTotal / item.quantity,
                    quantity: item.quantity,
                    image: product.imageUrls?.[0] || '',
                    sellerId: product.sellerId,
                    dealId: item.dealId || null,
                });
                sellerGroups[sellerId].subtotal += itemTotal;

                t.update(doc.ref, {
                    quantity: FieldValue.increment(-item.quantity),
                    status: (product.quantity || 0) - item.quantity === 0 ? 'sold' : product.status,
                });
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
                const payIdReference = `BNCH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

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
                    status: options?.paymentMethod === 'PayID Escrow' ? 'awaiting_payment' : 'processing',
                    paymentStatus: 'pending',
                    paymentMethod: options?.paymentMethod || 'Card',
                    shippingMethod: options?.shippingMethod || 'pickup',
                    shippingAddress: options?.shippingAddress || null,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    sellerPaypalMeLink: sellerPaypalLink,
                    payIdReference,
                    nudgeCount: 0,
                    lastNudgeAt: null,
                };

                t.set(orderRef, newOrder);
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

        if (!['processing', 'shipped'].includes(orderData?.status)) {
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
