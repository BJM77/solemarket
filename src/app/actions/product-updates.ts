'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendTelegramNotification } from '@/lib/telegram';

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

        const docRef = firestoreDb.collection('products').doc(productId);
        const docSnap = await docRef.get();
        if (!docSnap.exists) return { success: false, error: 'Product not found' };
        
        const productData = docSnap.data();
        const oldPrice = productData?.price || 0;

        await docRef.update({
            price: newPrice,
            updatedAt: FieldValue.serverTimestamp()
        });

        // Detect Price Drop and Notify
        if (newPrice < oldPrice) {
            const dropAmount = oldPrice - newPrice;
            const dropPercent = Math.round((dropAmount / oldPrice) * 100);

            // 1. Notify Admin/Telegram
            await sendTelegramNotification(
                `<b>📉 Price Drop Alert!</b>\n\n` +
                `<b>Product:</b> ${productData?.title}\n` +
                `<b>Old Price:</b> $${oldPrice}\n` +
                `<b>New Price:</b> $${newPrice} (-${dropPercent}%)\n\n` +
                `<a href="https://benched.au/product/${productId}">View Product</a>`
            );

            // 2. Background: Find all users who favorited this and prepare notifications
            // (In a real app, this would queue a job to send Push/Email)
            const favoritesSnap = await firestoreDb.collectionGroup('favorites')
                .where('id', '==', productId) // Assuming the favorite doc has the product ID
                .get();
            
            console.log(`Price drop: Notifying ${favoritesSnap.size} interested users.`);
        }

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
