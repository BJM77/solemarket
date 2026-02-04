'use server';

import { getAllProducts } from '@/services/product-service';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function getProductsForBulkEdit() {
    try {
        const products = await getAllProducts();
        return products;
    } catch (error) {
        console.error('Error fetching products for bulk edit:', error);
        return [];
    }
}

export async function bulkUpdateProducts(productIds: string[], updates: { price?: number; condition?: string; status?: string; }, idToken: string) {
    try {
        if (!idToken) {
             return { success: false, message: "Authentication required." };
        }
        await verifyIdToken(idToken);

        if (productIds.length === 0) {
            return { success: false, message: "No products selected." };
        }

        const batch = firestoreDb.batch();
        const updateData: any = {};

        if (updates.price) updateData.price = updates.price;
        if (updates.condition) updateData.condition = updates.condition;
        if (updates.status) updateData.status = updates.status;

        if (Object.keys(updateData).length === 0) {
            return { success: false, message: "No update fields provided." };
        }

        productIds.forEach(id => {
            const productRef = firestoreDb.collection('products').doc(id);
            batch.update(productRef, updateData);
        });

        await batch.commit();

        return { success: true, message: `${productIds.length} products updated successfully.` };

    } catch (error: any) {
        console.error("Error in bulkUpdateProducts:", error);
        return { success: false, message: error.message || "An unexpected error occurred during the bulk update." };
    }
}
