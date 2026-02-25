'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import type { Product, Review, Category, Seller } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { cache } from 'react';

// Helper to serialize Admin Timestamps to plain objects for Client Components
const serializeData = (docData: any, docId: string) => {
    if (!docData) return null;

    const serialized: { [key: string]: any } = { id: docId };

    for (const key in docData) {
        if (Object.prototype.hasOwnProperty.call(docData, key)) {
            const value = docData[key];

            // Check for Admin SDK Timestamp
            if (value && typeof value.toDate === 'function') {
                const date = value.toDate();
                serialized[key] = { seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 };
            }
            // Check for serialized timestamp
            else if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
                serialized[key] = value;
            }
            else {
                serialized[key] = value;
            }
        }
    }
    return serialized;
};

export const getProductById = cache(async (id: string): Promise<Product | null> => {
    try {
        console.log(`getProductById: Attempting to fetch ${id}`);
        const docSnap = await firestoreDb.collection('products').doc(id).get();
        console.log(`getProductById: Fetch complete. Exists: ${docSnap.exists}`);
        if (docSnap.exists) {
            return serializeData(docSnap.data(), docSnap.id) as Product;
        }
        return null;
    } catch (e: any) {
        console.error(`Failed to fetch product ${id}:`, e.message);
        return null;
    }
});

export async function getReviewsForProduct(productId: string): Promise<Review[]> {
    try {
        const querySnapshot = await firestoreDb.collection('reviews')
            .where('productId', '==', productId)
            .orderBy('createdAt', 'desc')
            .get();

        return querySnapshot.docs.map((doc: any) => serializeData(doc.data(), doc.id) as Review);
    } catch (e: any) {
        console.error('Failed to fetch reviews:', e.message);
        return [];
    }
}

import { MARKETPLACE_CATEGORIES } from '@/config/categories';

export async function getCategories(): Promise<Category[]> {
    return MARKETPLACE_CATEGORIES;
}

export async function getTopSellers(limitCount: number): Promise<Seller[]> {
    try {
        const snapshot = await firestoreDb.collection('users')
            .where('accountType', '==', 'seller')
            .limit(limitCount)
            .get();

        if (snapshot.empty) return [];

        const sellers = snapshot.docs.map((docSnap: any) => {
            const data = serializeData(docSnap.data(), docSnap.id) as any;
            return {
                ...data,
                id: docSnap.id,
                rating: 4.5 + Math.random() * 0.5,
                totalSales: Math.floor(Math.random() * 200) + 50,
                avatarUrl: data.photoURL,
            } as Seller;
        });

        return sellers;
    } catch (e: any) {
        console.error('Failed to fetch top sellers:', e.message);
        return [];
    }
}

export async function getPublicProductCount(): Promise<number> {
    try {
        const snapshot = await firestoreDb.collection('products')
            .where('status', '==', 'available')
            .count()
            .get();

        return snapshot.data().count;
    } catch (e: any) {
        console.error("Failed to count products:", e.message);
        return 0;
    }
}

export async function getActiveProductIds(limitCount = 1000, offset = 0): Promise<string[]> {
    try {
        let query = firestoreDb.collection('products')
            .where('status', '==', 'available')
            .where('isDraft', '==', false);

        if (offset > 0) {
            // Firestore doesn't support numeric offset well for large datasets, 
            // but for sitemap generation this is the simplest starting point.
            // Ideally we'd use startAfter(doc) for true performance.
            query = query.offset(offset);
        }

        const snapshot = await query.limit(limitCount).select().get();
        return snapshot.docs.map((doc: any) => doc.id);
    } catch (e: any) {
        console.error("Failed to fetch active product IDs:", e.message);
        return [];
    }
}

export async function getActiveProducts(limitCount = 1000, offset = 0): Promise<Product[]> {
    try {
        let query = firestoreDb.collection('products')
            .where('status', '==', 'available')
            .where('isDraft', '==', false);

        if (offset > 0) {
            query = query.offset(offset);
        }

        const snapshot = await query.limit(limitCount).get();
        return snapshot.docs.map((doc: any) => serializeData(doc.data(), doc.id) as Product);
    } catch (e: any) {
        console.error("Failed to fetch active products:", e.message);
        return [];
    }
}

export async function getActiveProductCount(): Promise<number> {
    try {
        const snapshot = await firestoreDb.collection('products')
            .where('status', '==', 'available')
            .where('isDraft', '==', false)
            .count()
            .get();

        return snapshot.data().count;
    } catch (e: any) {
        console.error("Failed to count active products:", e.message);
        return 0;
    }
}
