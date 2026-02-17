'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function requestBrandAction(idToken: string, brandName: string, notes?: string) {
    if (!idToken || !brandName) {
        return { success: false, error: 'Brand name is required.' };
    }

    try {
        const decodedToken = await verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const requestRef = firestoreDb.collection('brand_requests').doc();
        await requestRef.set({
            id: requestRef.id,
            userId,
            userEmail: decodedToken.email || '',
            brandName,
            notes: notes || '',
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { success: true, message: 'Brand request submitted successfully!' };
    } catch (error: any) {
        console.error('Error requesting brand:', error);
        return { success: false, error: error.message || 'Failed to submit request.' };
    }
}
