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
        const docSnap = await firestoreDb.collection('products').doc(id).get();
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

        return querySnapshot.docs.map((doc) => serializeData(doc.data(), doc.id) as Review);
    } catch (e: any) {
        console.error('Failed to fetch reviews:', e.message);
        return [];
    }
}

export async function getCategories(): Promise<Category[]> {
    try {
        const snapshot = await firestoreDb.collection('categories')
            .orderBy('name')
            .get();

        if (snapshot.empty) return [];
        return snapshot.docs.map(doc => serializeData(doc.data(), doc.id) as Category);
    } catch (e: any) {
        console.error('Failed to fetch categories: ', e.message);
        return [];
    }
}

export async function getTopSellers(limitCount: number): Promise<Seller[]> {
    try {
        const snapshot = await firestoreDb.collection('users')
            .where('accountType', '==', 'seller')
            .limit(limitCount)
            .get();

        if (snapshot.empty) return [];

        const sellers = snapshot.docs.map(docSnap => {
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

export async function getActiveProductIds(limitCount = 1000): Promise<string[]> {
    try {
        const snapshot = await firestoreDb.collection('products')
            .where('status', '==', 'available')
            .where('isDraft', '==', false)
            .limit(limitCount)
            .get();

        return snapshot.docs.map(doc => doc.id);
    } catch (e: any) {
        console.error("Failed to fetch active product IDs:", e.message);
        return [];
    }
}
