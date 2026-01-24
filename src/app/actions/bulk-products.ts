
'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import type { Product, UserProfile } from '@/lib/types';
import { revalidatePath } from 'next/cache';

type BulkCreateProductData = {
    title: string;
    description: string;
    price: number;
    category: string;
    subCategory?: string;
    condition: string;
    quantity: number;
    imageUrls: string[];
};

export type BulkCreateProductResult = 
    | { success: true; count: number; }
    | { success: false; error: string; };

export async function bulkCreateProductsFromCSV(
    idToken: string,
    productsData: BulkCreateProductData[]
): Promise<BulkCreateProductResult> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const userRef = firestoreDb.collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return { success: false, error: 'User profile not found.' };
        }

        const userProfile = userSnap.data() as UserProfile;

        if (userProfile.role !== 'superadmin' && userProfile.canSell !== true) {
            return { success: false, error: 'You do not have permission to list products.' };
        }

        const batch = firestoreDb.batch();
        const productsCollection = firestoreDb.collection("products");

        productsData.forEach(productData => {
            const docRef = productsCollection.doc(); // Auto-generate ID
            
            const finalData: Product = {
                ...(productData as Omit<Product, 'id' | 'sellerId' | 'sellerEmail' | 'sellerName' | 'sellerAvatar' | 'status' | 'isDraft' | 'createdAt' | 'updatedAt'>),
                id: docRef.id,
                sellerId: decodedToken.uid,
                sellerEmail: decodedToken.email || '',
                sellerName: userProfile.displayName,
                sellerAvatar: userProfile.photoURL,
                status: 'available',
                isDraft: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
                updatedAt: admin.firestore.FieldValue.serverTimestamp() as admin.firestore.Timestamp,
            };
            
            batch.set(docRef, finalData);
        });

        await batch.commit();

        // TODO: The revalidatePath calls below can be a performance bottleneck in a multi-user environment.
        // Consider switching to Incremental Static Regeneration (ISR) with a revalidation time on the affected pages 
        // to avoid revalidating on every single product creation.
        revalidatePath('/browse');
        revalidatePath('/sell/dashboard');
        revalidatePath(`/profile/listings`);

        return { success: true, count: productsData.length };

    } catch (error: any) {
        console.error("Error bulk creating products:", error);
        return { success: false, error: error.message || 'An unexpected error occurred during bulk creation.' };
    }
}
