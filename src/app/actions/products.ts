'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import type { Product, UserProfile } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { productFormSchema } from '@/schemas/product';

export type CreateProductResult =
    | { success: true; productId: string; }
    | { success: false; error: string; };

export async function createProductAction(
    idToken: string,
    productData: Partial<Product>
): Promise<CreateProductResult> {
    console.log('=== CREATE PRODUCT ACTION START ===');
    console.log('productData received keys:', Object.keys(productData));
    // console.log('productData:', JSON.stringify(productData, null, 2)); // Careful with PII

    try {
        const decodedToken = await verifyIdToken(idToken);
        console.log('Token verified for UID:', decodedToken.uid);

        const userRef = firestoreDb.collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            console.error('User profile not found');
            return { success: false, error: 'User profile not found.' };
        }

        const userProfile = userSnap.data() as UserProfile;
        console.log('User Profile:', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: userProfile.role,
            canSell: userProfile.canSell,
            profileExists: userSnap.exists,
        });

        // Check for permission to sell
        if (userProfile.role !== 'superadmin' && userProfile.canSell !== true) {
            console.error('PERMISSION DENIED: User cannot sell');
            return { success: false, error: 'You do not have permission to list products.' };
        }

        const productsCollection = firestoreDb.collection("products");
        const docRef = productsCollection.doc(); // Auto-generate ID

        // Validate incoming data against schema
        console.log('Validating data...');
        console.log('Raw productData before validation:', JSON.stringify(productData, null, 2));
        const validationResult = productFormSchema.safeParse(productData);

        if (!validationResult.success) {
            console.error('VALIDATION FAILED!');
            console.error('Validation Errors:', JSON.stringify(validationResult.error.errors, null, 2));
            const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${errorMessages}` };
        }

        console.log('Validation successful.');
        const validData = validationResult.data;

        // Note: validData from Zod might strip unknown keys if not configured to passthrough.
        // We ensure we cast it to Product structure for Firestore.

        const finalData: Product = {
            ...validData, // Safe spread of validated properties
            id: docRef.id,
            sellerId: decodedToken.uid,
            sellerEmail: decodedToken.email || '',
            sellerName: userProfile.displayName,
            sellerAvatar: userProfile.photoURL,
            // Cast timestamps because Admin SDK uses a different class than client/type definition might expect
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        console.log('Saving to Firestore...');
        await docRef.set(finalData);
        console.log('Product saved:', docRef.id);

        revalidatePath('/browse');
        revalidatePath(`/product/${docRef.id}`);

        return { success: true, productId: docRef.id };

    } catch (error: any) {
        console.error("Error in createProductAction:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}

export async function recordProductView(productId: string, userId?: string) {
    const productRef = firestoreDb.collection('products').doc(productId);

    return firestoreDb.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
            // Silently fail if product doesn't exist to avoid client errors
            return;
        }

        const updates: any = {
            views: admin.firestore.FieldValue.increment(1),
            lastViewedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (userId) {
            const data = productDoc.data();
            const viewedByUsers = data?.viewedByUsers || [];
            if (!viewedByUsers.includes(userId)) {
                updates.uniqueViews = admin.firestore.FieldValue.increment(1);
                updates.viewedByUsers = admin.firestore.FieldValue.arrayUnion(userId);
            }
        }

        transaction.update(productRef, updates);
    });
}