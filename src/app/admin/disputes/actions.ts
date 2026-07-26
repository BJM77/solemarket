'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { serializeFirestoreData } from '@/lib/utils';

export interface Dispute {
    id: string;
    orderId: string;
    buyerId: string;
    sellerId: string;
    reason: string;
    status: 'pending' | 'resolved_buyer' | 'resolved_seller';
    createdAt: any;
    updatedAt: any;
}

/**
 * Get all disputes
 */
export async function getDisputes() {
    const snapshot = await firestoreDb
        .collection('disputes')
        .orderBy('createdAt', 'desc')
        .get();

    const disputes = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
    })) as Dispute[];

    return serializeFirestoreData(disputes);
}

/**
 * Resolve a dispute
 */
export async function resolveDispute(disputeId: string, resolution: 'resolved_buyer' | 'resolved_seller') {
    const disputeRef = firestoreDb.collection('disputes').doc(disputeId);
    const disputeDoc = await disputeRef.get();

    if (!disputeDoc.exists) {
        throw new Error('Dispute not found');
    }

    const disputeData = disputeDoc.data() as Dispute;

    // Update dispute status
    await disputeRef.update({
        status: resolution,
        updatedAt: Timestamp.now(),
    });

    // Optionally: Trigger refund or payout logic via Stripe/DealSafe here
    // based on resolution status (e.g. if resolved_buyer, issue refund)
    
    // For now, we simply update the dispute doc and the linked order if necessary
    const orderRef = firestoreDb.collection('orders').doc(disputeData.orderId);
    if ((await orderRef.get()).exists) {
        await orderRef.update({
            status: resolution === 'resolved_buyer' ? 'refunded' : 'completed',
            updatedAt: Timestamp.now()
        });
    }

    return true;
}
