
'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import type { Product } from '@/lib/types';
import { serializeFirestoreData } from '@/lib/utils';
import { getSystemSettingsAdmin } from '@/services/settings-service';
import { calculateItemTotal, calculateShipping, calculateTax } from '@/lib/pricing';
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
}

export async function createOrderAction(items: CartItem[], idToken: string, options?: OrderOptions) {
    if (!items || items.length === 0) {
        return { error: 'Your cart is empty.' };
    }

    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: buyerId, email: buyerEmail, name: buyerName } = decodedToken;

        const results = await firestoreDb.runTransaction(async (t: any) => {
            const productRefs = items.map(item => firestoreDb.collection('products').doc(item.id));
            const productDocs = await t.getAll(...productRefs);

            // 1. Group items by seller
            const sellerGroups: Record<string, { items: any[], subtotal: number, sellerName: string }> = {};
            const sellerIds = new Set<string>();

            // Pre-scan to get seller IDs
            productDocs.forEach((doc: any) => {
                if (doc.exists) {
                    const product = doc.data() as Product;
                    if (product.sellerId) sellerIds.add(product.sellerId);
                }
            });

            // Fetch seller profiles to get PayPal links
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

                const sellerId = product.sellerId;
                if (!sellerGroups[sellerId]) {
                    sellerGroups[sellerId] = { items: [], subtotal: 0, sellerName: product.sellerName };
                }

                const itemTotal = (item.dealId && item.bundlePrice !== undefined)
                    ? item.bundlePrice
                    : calculateItemTotal(product.price, item.quantity, product.multibuyEnabled, product.multibuyTiers);

                sellerGroups[sellerId].items.push({
                    id: item.id,
                    title: product.title,
                    price: product.price,
                    discountedPrice: itemTotal / item.quantity,
                    quantity: item.quantity,
                    image: product.imageUrls?.[0] || '',
                    sellerId: product.sellerId,
                    dealId: item.dealId,
                });
                sellerGroups[sellerId].subtotal += itemTotal;

                // Deduct inventory
                t.update(doc.ref, {
                    quantity: FieldValue.increment(-item.quantity),
                    status: (product.quantity || 0) - item.quantity === 0 ? 'sold' : product.status,
                });
            }

            const settings = await getSystemSettingsAdmin();
            const groupOrderId = `GRP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
            const createdOrders = [];

            // 2. Create an order for each seller
            for (const [sellerId, group] of Object.entries(sellerGroups)) {
                const orderRef = firestoreDb.collection('orders').doc();

                const shippingCost = calculateShipping(
                    group.subtotal,
                    options?.shippingMethod || 'pickup',
                    {
                        freightCharge: settings.freightCharge,
                        freeShippingThreshold: settings.freeShippingThreshold
                    }
                );

                const taxAmount = calculateTax(group.subtotal, settings.standardTaxRate);
                const totalAmount = group.subtotal + shippingCost + taxAmount;

                // Get the first product to determine seller - safe because group has items
                // Use fetchedUsers to get PayPal link
                const sellerPaypalLink = fetchedUsers[sellerId]?.paypalMeLink || null;

                const newOrder = {
                    groupOrderId,
                    items: group.items,
                    totalAmount,
                    subtotal: group.subtotal,
                    shippingCost,
                    taxAmount,
                    buyerId,
                    buyerEmail,
                    buyerName: buyerName || buyerEmail,
                    sellerId,
                    sellerName: group.sellerName,
                    status: 'processing',
                    paymentStatus: 'pending',
                    paymentMethod: 'Cash on Delivery',
                    shippingMethod: options?.shippingMethod || 'pickup',
                    shippingAddress: options?.shippingAddress || null,
                    createdAt: FieldValue.serverTimestamp(),
                    updatedAt: FieldValue.serverTimestamp(),
                    sellerPaypalMeLink: sellerPaypalLink,
                };

                t.set(orderRef, newOrder);
                createdOrders.push({ id: orderRef.id, ...newOrder });
            }

            return createdOrders;
        });

        // Serialize for client
        const serializedOrders = results.map((order: any) => serializeFirestoreData({
            ...order,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

        // Send Telegram notification for the new order(s)
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

        return { orders: serializedOrders };

    } catch (error: any) {
        console.error('Order creation failed:', error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}

/**
 * Updates the status of an order.
 */
export async function updateOrderStatus(idToken: string, orderId: string, status: string, trackingInfo?: { carrier: string, trackingNumber: string }) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { uid: userId } = decodedToken;

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) throw new Error("Order not found.");
        const orderData = orderSnap.data();

        // Check if the user is the seller of this order or an admin
        const isOwner = orderData?.sellerId === userId;
        const isStaff = ['admin', 'superadmin'].includes(decodedToken.role);

        if (!isOwner && !isStaff) {
            throw new Error("Unauthorized access.");
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
