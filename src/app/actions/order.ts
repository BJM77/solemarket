
'use server'

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Product } from '@/lib/types';
import { serializeFirestoreDoc } from '@/lib/firebase/serializers';
import { getSystemSettingsAdmin } from '@/services/settings-service';

interface CartItem {
    id: string;
    quantity: number;
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
        // 1. Verify User
        const decodedToken = await verifyIdToken(idToken);
        const { uid: buyerId, email: buyerEmail } = decodedToken;

        const orderDetails = await firestoreDb.runTransaction(async (t) => {
            let subtotal = 0;
            const productRefs = items.map(item => firestoreDb.collection('products').doc(item.id));
            const productDocs = await t.getAll(...productRefs);

            // 2. Validate Price & Stock
            for (let i = 0; i < items.length; i++) {
                const doc = productDocs[i];
                const item = items[i];

                if (!doc.exists) {
                    throw new Error(`Product with ID ${item.id} not found.`);
                }

                const product = doc.data() as Product;

                if ((product.quantity || 0) < item.quantity) {
                    throw new Error(`Not enough stock for ${product.title}. Only ${product.quantity} left.`);
                }

                // Use the database price, not the client price
                subtotal += product.price * item.quantity;

                // Prepare inventory deduction
                t.update(doc.ref, {
                    quantity: FieldValue.increment(-item.quantity),
                    status: (product.quantity || 0) - item.quantity === 0 ? 'sold' : product.status,
                });
            }

            // 3. Calculate Total (server-side)
            const settings = await getSystemSettingsAdmin();
            const freightCharge = settings.freightCharge;
            const threshold = settings.freeShippingThreshold;
            const taxRate = settings.standardTaxRate;

            const shippingCost = options?.shippingMethod === 'shipping'
                ? (subtotal >= threshold ? 0 : freightCharge)
                : 0;

            const taxAmount = subtotal * taxRate;
            const totalAmount = subtotal + shippingCost + taxAmount;

            // 4. Create Order Document
            const orderRef = firestoreDb.collection('orders').doc();
            const newOrder = {
                items: items, // Contains IDs and quantities
                totalAmount,
                subtotal,
                shippingCost,
                taxAmount,
                buyerId,
                buyerEmail,
                status: 'processing',
                paymentMethod: 'Cash on Delivery',
                shippingMethod: options?.shippingMethod || 'pickup',
                shippingAddress: options?.shippingAddress || null,
                createdAt: FieldValue.serverTimestamp(),
            };

            t.set(orderRef, newOrder);

            // Fetch full item details for the confirmation page
            const itemsWithDetails = productDocs.map((doc, i) => {
                return serializeFirestoreDoc({
                    ...(doc.data() as Product),
                    id: doc.id,
                    quantity: items[i].quantity,
                });
            });

            // We need to resolve the serverTimestamp sentinel to a client-friendly value (e.g. now)
            // because we can't read back the written time within the same transaction easily/efficiently
            // without a fresh read which might be overkill.
            const serializedOrder = {
                ...newOrder,
                createdAt: new Date().toISOString(), // Approximation for client display
                orderId: orderRef.id,
                items: itemsWithDetails,
                totalAmount
            };

            return serializedOrder;
        });

        return { order: orderDetails };

    } catch (error: any) {
        console.error('Order creation failed:', error);
        return { error: error.message || 'An unexpected error occurred.' };
    }
}
