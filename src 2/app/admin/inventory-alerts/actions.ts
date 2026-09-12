'use server';

import { firestoreDb } from '@/lib/firebase/admin';

export async function updateMinStockQuantity(productId: string, minStockQuantity: number) {
    try {
        const productRef = firestoreDb.collection('products').doc(productId);
        await productRef.update({ minStockQuantity });
        return { success: true, message: 'Minimum stock quantity updated successfully.' };
    } catch (error) {
        console.error('Error updating minimum stock quantity:', error);
        return { success: false, message: 'Failed to update minimum stock quantity.' };
    }
}
