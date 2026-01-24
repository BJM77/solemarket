'use server';

import { getAllProducts } from '@/services/product-service';
import { db } from '@/lib/firebase/config';
import { writeBatch, doc } from 'firebase/firestore';

export async function getProductsForBulkEdit() {
    try {
        const products = await getAllProducts();
        return products;
    } catch (error) {
        console.error('Error fetching products for bulk edit:', error);
        return [];
    }
}

export async function bulkUpdateProducts(productIds: string[], updates: { price?: number; condition?: string; status?: string; }) {
    try {
        if (productIds.length === 0) {
            return { success: false, message: "No products selected." };
        }

        const batch = writeBatch(db);
        const updateData: any = {};

        if (updates.price) updateData.price = updates.price;
        if (updates.condition) updateData.condition = updates.condition;
        if (updates.status) updateData.status = updates.status;

        if (Object.keys(updateData).length === 0) {
            return { success: false, message: "No update fields provided." };
        }

        productIds.forEach(id => {
            const productRef = doc(db, 'products', id);
            batch.update(productRef, updateData);
        });

        await batch.commit();

        return { success: true, message: `${productIds.length} products updated successfully.` };

    } catch (error) {
        console.error("Error in bulkUpdateProducts:", error);
        return { success: false, message: "An unexpected error occurred during the bulk update." };
    }
}
