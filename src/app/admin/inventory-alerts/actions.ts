'use server';

import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

export async function updateMinStockQuantity(productId: string, minStockQuantity: number) {
    try {
        const productRef = doc(db, 'products', productId);
        await updateDoc(productRef, { minStockQuantity });
        return { success: true, message: 'Minimum stock quantity updated successfully.' };
    } catch (error) {
        console.error('Error updating minimum stock quantity:', error);
        return { success: false, message: 'Failed to update minimum stock quantity.' };
    }
}
