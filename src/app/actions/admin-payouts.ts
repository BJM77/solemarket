'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { serializeFirestoreData } from '@/lib/utils';
import { FieldValue } from 'firebase-admin/firestore';
import { getSystemSettingsAdmin } from '@/services/settings-service';

export async function getPendingPayouts(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        if (!['admin', 'superadmin'].includes(decodedToken.role)) {
            throw new Error('Unauthorized');
        }

        const settings = await getSystemSettingsAdmin();

        const ordersSnapshot = await firestoreDb.collection('orders')
            .where('status', '==', 'delivered')
            .where('payoutStatus', '!=', 'settled')
            .get();

        const orders = ordersSnapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
        }));

        // Now, we need to check the seller's profile if they have a fee waiver or founder status
        const sellerIds = Array.from(new Set(orders.map((o: any) => o.sellerId)));
        const sellerProfiles: Record<string, any> = {};

        if (sellerIds.length > 0) {
            const sellerRefs = sellerIds.map(id => firestoreDb.collection('users').doc(id));
            const sellerDocs = await firestoreDb.getAll(...sellerRefs);

            sellerDocs.forEach((doc: any) => {
                if (doc.exists) {
                    sellerProfiles[doc.id] = doc.data();
                }
            });
        }

        const processedOrders = orders.map((order: any) => {
            const sellerProfile = sellerProfiles[order.sellerId] || {};
            // Founder onboarding logic: early adopters have special badges and fee waivers
            const hasFeeWaiver = sellerProfile.feeWaiver === true || sellerProfile.isFounder === true || sellerProfile.isEarlyAdopter === true;

            // Use dynamic platform fee from settings
            const platformFeePercentage = hasFeeWaiver ? 0 : (settings.platformFeeRate || 0.07);
            const platformFeeAmount = order.subtotal * platformFeePercentage;

            // The seller receives Total Amount minus Platform Fee
            const payoutAmount = order.totalAmount - platformFeeAmount;

            return serializeFirestoreData({
                ...order,
                platformFeeAmount,
                platformFeePercentage,
                payoutAmount,
                hasFeeWaiver,
                sellerPaypalMeLink: sellerProfile.paypalMeLink || null,
                sellerBankDetails: sellerProfile.bankDetails || null,
                createdAt: (order.createdAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
                updatedAt: (order.updatedAt as any)?.toDate?.().toISOString() || new Date().toISOString(),
            });
        });

        // Filter out any implicitly settled orders just in case firestore index fails
        const filteredOrders = processedOrders.filter((o: any) => o.payoutStatus !== 'settled').sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        return {
            success: true,
            orders: filteredOrders
        };
    } catch (error: any) {
        console.error('Error fetching pending payouts:', error);
        return { success: false, error: error.message };
    }
}

export async function markPayoutAsSettled(idToken: string, orderId: string, referenceId?: string) {
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
            payoutStatus: 'settled',
            payoutDate: FieldValue.serverTimestamp(),
            payoutReference: referenceId || 'manual',
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true, message: 'Order payout marked as settled.' };
    } catch (error: any) {
        console.error('Error settling payout:', error);
        return { success: false, error: error.message };
    }
}
