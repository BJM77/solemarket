'use server';

import { db } from '@/lib/firebase/config';
import { collection, addDoc, Timestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Dispute } from '@/lib/types';
import { sendNotification } from '@/services/notifications';

export async function lodgeDispute(data: {
    orderId: string;
    initiatorId: string;
    initiatorName: string;
    initiatorRole: 'buyer' | 'seller';
    reason: string;
    description: string;
    evidenceUrls?: string[];
}) {
    try {
        const dispute: Omit<Dispute, 'id'> = {
            ...data,
            status: 'open',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        };

        const docRef = await addDoc(collection(db, 'disputes'), dispute);

        // Also update the order status if possible (optional but good)
        // const orderRef = doc(db, 'orders', data.orderId);
        // await updateDoc(orderRef, { status: 'disputed' });

        // Notify Admins (logic would go here, maybe trigger a notification to super admins)
        // sendNotification(...) 

        return { success: true, id: docRef.id, message: 'Dispute lodged successfully. An admin will review it shortly.' };
    } catch (error: any) {
        console.error('Error lodging dispute:', error);
        return { success: false, message: error.message || 'Failed to lodge dispute.' };
    }
}

export async function getDisputes() {
    // This would likely be used in the admin panel
    // ...
}
