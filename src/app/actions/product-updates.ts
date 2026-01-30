'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function updateProductPrice(productId: string, newPrice: number, idToken: string) {
    if (!productId || typeof newPrice !== 'number' || !idToken) {
        return { success: false, error: 'Invalid input' };
    }

    try {
        const decoded = await verifyIdToken(idToken);
        const role = decoded.role;
        if (role !== 'superadmin' && role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        await firestoreDb.collection('products').doc(productId).update({
            price: newPrice,
            updatedAt: FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error: any) {
        console.error('Update price error:', error);
        return { success: false, error: error.message };
    }
}

export async function bulkUpdateProductPrice(productIds: string[], newPrice: number, idToken: string) {
    if (!productIds.length || typeof newPrice !== 'number' || !idToken) {
        return { success: false, error: 'Invalid input' };
    }

    try {
        const decoded = await verifyIdToken(idToken);
        const role = decoded.role;
        if (role !== 'superadmin' && role !== 'admin') {
            return { success: false, error: 'Unauthorized' };
        }

        const batch = firestoreDb.batch();
        productIds.forEach(id => {
            const ref = firestoreDb.collection('products').doc(id);
            batch.update(ref, {
                price: newPrice,
                updatedAt: FieldValue.serverTimestamp()
            });
        });

        await batch.commit();

        return { success: true };
    } catch (error: any) {
        console.error('Bulk update price error:', error);
        return { success: false, error: error.message };
    }
}

export async function incrementProductContactCount(productId: string) {
    if (!productId) {
        return { success: false, error: 'Invalid Product ID' };
    }

    try {
        await firestoreDb.collection('products').doc(productId).update({
            contactCallCount: FieldValue.increment(1)
        });
        return { success: true };
    } catch (error: any) {
        console.error('Increment contact count error:', error);
        // We don't want to alert the user really, just log it.
        return { success: false, error: error.message };
    }
}
