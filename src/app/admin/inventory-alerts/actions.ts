'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { ensureActionAuth } from '@/lib/action-utils';

export async function updateMinStockQuantity(
    idToken: string,
    productId: string,
    minStockQuantity: number
) {
    try {
        await ensureActionAuth(idToken, ['admin', 'superadmin']);

        if (!productId) {
            return { success: false, message: 'Product ID is required.' };
        }

        if (typeof minStockQuantity !== 'number' || !Number.isInteger(minStockQuantity) || minStockQuantity < 0) {
            return { success: false, message: 'Threshold must be a non-negative integer.' };
        }

        const productRef = firestoreDb.collection('products').doc(productId);
        await productRef.update({
            minStockQuantity,
            updatedAt: new Date(),
        });

        return { success: true, message: 'Minimum stock quantity updated successfully.' };
    } catch (error: any) {
        console.error('Error updating minimum stock quantity:', error);
        return { success: false, message: error?.message || 'Failed to update minimum stock quantity.' };
    }
}
