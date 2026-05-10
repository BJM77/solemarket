'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { Dispute } from '@/lib/types';
import { ensureActionAuth } from '@/lib/action-utils';

export async function lodgeDispute(data: {
    orderId: string;
    initiatorId: string;
    initiatorName: string;
    initiatorRole: 'buyer' | 'seller';
    reason: string;
    description: string;
    evidenceUrls?: string[];
    idToken: string;
}) {
    try {
        // 1. Verify Authentication
        await ensureActionAuth(data.idToken);

        const disputeData = {
            orderId: data.orderId,
            initiatorId: data.initiatorId,
            initiatorName: data.initiatorName,
            initiatorRole: data.initiatorRole,
            reason: data.reason,
            description: data.description,
            evidenceUrls: data.evidenceUrls || [],
            status: 'open',
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now(),
        };

        const docRef = await firestoreDb.collection('disputes').add(disputeData);

        return { 
            success: true, 
            id: docRef.id, 
            message: 'Dispute lodged successfully. An admin will review it shortly.' 
        };
    } catch (error: any) {
        console.error('Error lodging dispute:', error);
        return { 
            success: false, 
            message: error.message || 'Failed to lodge dispute.' 
        };
    }
}

export async function getDisputes() {
    // This would likely be used in the admin panel
    // ...
}
