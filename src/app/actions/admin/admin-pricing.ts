'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

/**
 * Server Action to update product price with admin role verification.
 * This replaces direct client-side Firestore writes to prevent unauthorized access.
 * 
 * @param productId - The ID of the product to update
 * @param newPrice - The new price to set
 * @param idToken - Firebase ID token for authentication
 * @returns Success status
 * @throws Error if user is not authorized or update fails
 */
export async function updateProductPrice(
    productId: string,
    newPrice: number,
    idToken: string
) {
    try {
        // Verify authentication and get user claims
        const decodedToken = await verifyIdToken(idToken);

        // Check if user has admin privileges
        const role = decodedToken.role as string | undefined;
        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        // Validate price
        if (typeof newPrice !== 'number' || newPrice < 0) {
            throw new Error('Invalid price value');
        }

        // Update product price in Firestore
        await firestoreDb.collection('products').doc(productId).update({
            price: newPrice,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true };
    } catch (error: any) {
        console.error('[updateProductPrice] Error:', error);
        throw new Error(error.message || 'Failed to update product price');
    }
}
