'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Product } from '@/lib/types';
import { notifySellerOfRemoval } from '@/ai/flows/notify-seller-of-removal';

/**
 * Result type for admin actions, ensuring a consistent response shape.
 */
export type AdminActionResult =
    | { success: true; message: string }
    | { success: false; error: string };

/**
 * An admin-only action to delete a product and notify the seller.
 * @param productId The ID of the product to delete.
 * @param idToken The Firebase ID token of the admin user.
 * @returns A promise that resolves to an AdminActionResult.
 */
export async function deleteProductByAdmin(
    productId: string,
    idToken: string
): Promise<AdminActionResult> {
    if (!productId || !idToken) {
        return {
            success: false,
            error: 'Product ID and authentication token are required.',
        };
    }

    try {
        // 1. Verify the user has the 'superadmin' or 'admin' role from the token's custom claims.
        const decodedToken = await verifyIdToken(idToken);
        const userRole = decodedToken.role;

        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return {
                success: false,
                error: 'You do not have permission to perform this action.',
            };
        }

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return { success: false, error: 'Product not found.' };
        }

        const product = productSnap.data() as Product;

        // 2. Delete the Product
        await productRef.delete();

        // 3. Notify the Seller via AI Flow (non-blocking)
        let notificationStatus = '';
        if (product.sellerEmail && product.sellerEmail.trim() !== '') {
            try {
                await notifySellerOfRemoval({
                    sellerEmail: product.sellerEmail,
                    sellerName: product.sellerName || 'Seller', // Fallback for sellerName
                    productName: product.title,
                    idToken
                });
                notificationStatus = ' and the seller has been notified';
            } catch (notifyError: any) {
                console.error('Failed to notify seller, but product was deleted:', notifyError);
                // Don't fail the entire operation if notification fails.
                notificationStatus = ' but failed to notify the seller';
            }
        }

        return {
            success: true,
            message: `Product "${product.title}" has been deleted${notificationStatus}.`,
        };

    } catch (error: any) {
        console.error('Admin Delete Product Error:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred during deletion.',
        };
    }
}

/**
 * An admin-only action to renew a product listing by updating its createdAt date to now.
 */
export async function renewProductByAdmin(
    productId: string,
    idToken: string
): Promise<AdminActionResult> {
    if (!productId || !idToken) {
        return { success: false, error: 'Product ID and authentication token are required.' };
    }

    try {
        const decodedToken = await verifyIdToken(idToken);
        const userRole = decodedToken.role;

        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return {
                success: false,
                error: 'You do not have permission to perform this action.',
            };
        }

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return { success: false, error: 'Product not found.' };
        }

        const admin = require('firebase-admin');
        await productRef.update({
            createdAt: admin.firestore.Timestamp.now()
        });

        return {
            success: true,
            message: `Product listing has been renewed.`,
        };
    } catch (error: any) {
        console.error('Admin Renew Product Error:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred during renewal.',
        };
    }
}

/**
 * An admin-only action to approve a pending product listing.
 * Sets the release timestamps for tiered access.
 */
export async function approveProductByAdmin(
    productId: string,
    idToken: string
): Promise<AdminActionResult> {
    if (!productId || !idToken) {
        return { success: false, error: 'Product ID and authentication token are required.' };
    }

    try {
        const decodedToken = await verifyIdToken(idToken);
        const userRole = decodedToken.role;

        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return {
                success: false,
                error: 'You do not have permission to perform this action.',
            };
        }

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return { success: false, error: 'Product not found.' };
        }

        const admin = require('firebase-admin');
        const now = admin.firestore.Timestamp.now();
        const oneHourLater = admin.firestore.Timestamp.fromMillis(now.toMillis() + (60 * 60 * 1000));

        await productRef.update({
            status: 'available',
            approvedAt: now,
            publicReleaseAt: oneHourLater,
            updatedAt: now,
        });

        return {
            success: true,
            message: `Product has been approved and released to Business users. It will be public in 1 hour.`,
        };
    } catch (error: any) {
        console.error('Admin Approve Product Error:', error);
        return {
            success: false,
            error: error.message || 'An unexpected error occurred during approval.',
        };
    }
}

/**
 * An admin-only action to toggle product hold status (e.g., for fraud investigation).
 */
export async function toggleProductHold(
    productId: string,
    onHold: boolean,
    reason: string,
    idToken: string
): Promise<AdminActionResult> {
    if (!productId || !idToken) return { success: false, error: 'Invalid input' };

    try {
        const decodedToken = await verifyIdToken(idToken);
        const userRole = decodedToken.role;

        if (userRole !== 'superadmin' && userRole !== 'admin') {
            return { success: false, error: 'Permission denied.' };
        }

        const productRef = firestoreDb.collection('products').doc(productId);
        const adminAuth = require('firebase-admin');

        const updates: any = {
            status: onHold ? 'on_hold' : 'available', // Revert to available if unheld
            updatedAt: adminAuth.firestore.Timestamp.now()
        };

        if (onHold) {
            updates.holdReason = reason;
        } else {
            updates.holdReason = adminAuth.firestore.FieldValue.delete();
        }

        await productRef.update(updates);

        if (onHold) {
            const productSnap = await productRef.get();
            const sellerId = productSnap.data()?.sellerId;
            if (sellerId) {
                // Dynamically import to avoid circular dependency if possible, though nextjs handles it often
                const { issueWarning } = await import('./admin-users');
                await issueWarning(idToken, sellerId, `Product "${productSnap.data()?.title}" placed on hold: ${reason}`);
            }
        }

        return {
            success: true,
            message: onHold ? "Product placed on hold and seller warned." : "Product released from hold.",
        };

    } catch (error: any) {
        console.error('Admin Hold Product Error:', error);
        return { success: false, error: error.message };
    }
}
