'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { serializeFirestoreData } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';

export async function getPendingEscrowOrders(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const ordersSnapshot = await firestoreDb.collection('orders')
            .where('status', '==', 'awaiting_payment')
            .orderBy('createdAt', 'desc')
            .get();

        const orders = ordersSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        return {
            success: true,
            orders: orders.map((order: any) => serializeFirestoreData({
                ...order,
                createdAt: (order.createdAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
                updatedAt: (order.updatedAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
            }))
        };
    } catch (error: any) {
        console.error('Error fetching pending escrows:', error);
        return { success: false, error: error.message };
    }
}

export async function markEscrowAsPaid(idToken: string, orderId: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const orderRef = firestoreDb.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            throw new Error('Order not found');
        }

        await orderRef.update({
            status: 'processing', // 'processing' signals the seller to ship
            paymentStatus: 'paid',
            updatedAt: FieldValue.serverTimestamp()
        });

        // Here we could also send an email/notification to the seller

        return { success: true, message: 'Order marked as paid. Seller notified to ship.' };
    } catch (error: any) {
        console.error('Error marking escrow as paid:', error);
        return { success: false, error: error.message };
    }
}
