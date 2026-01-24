
'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import type { Product, UserProfile } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { productFormSchema } from '@/schemas/product';

if (!admin.apps.length) {
    try {
        admin.initializeApp();
    } catch (e) { console.error('Firebase admin initialization error', e); }
}

export type CreateProductResult =
    | { success: true; productId: string; }
    | { success: false; error: string; };

export async function createProductAction(
    idToken: string,
    productData: Partial<Product>
): Promise<CreateProductResult> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const userRef = firestoreDb.collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return { success: false, error: 'User profile not found.' };
        }

        const userProfile = userSnap.data() as UserProfile;

        // Check for permission to sell
        if (userProfile.role !== 'superadmin' && userProfile.canSell !== true) {
            return { success: false, error: 'You do not have permission to list products.' };
        }

        const productsCollection = firestoreDb.collection("products");
        const docRef = productsCollection.doc(); // Auto-generate ID

        // Validate incoming data against schema
        const validationResult = productFormSchema.safeParse(productData);

        if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${errorMessages}` };
        }

        const validData = validationResult.data;

        const finalData: Product = {
            ...validData, // Safe spread of validated properties
            id: docRef.id,
            sellerId: decodedToken.uid,
            sellerEmail: decodedToken.email || '',
            sellerName: userProfile.displayName,
            sellerAvatar: userProfile.photoURL,
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
        };

        await docRef.set(finalData);

        // TODO: The revalidatePath calls below can be a performance bottleneck in a multi-user environment.
        // Consider switching to Incremental Static Regeneration (ISR) with a revalidation time on the affected pages 
        // to avoid revalidating on every single product creation.
        revalidatePath('/browse');
        revalidatePath(`/product/${docRef.id}`);

        return { success: true, productId: docRef.id };

    } catch (error: any) {
        console.error("Error creating product:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}
