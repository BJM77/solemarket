'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { createUserProfile } from '@/lib/firebase/client-ops';
import type { Product, UserProfile } from '@/lib/types';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';

import { productFormSchema } from '@/schemas/product';
import { serializeFirestoreData } from '@/lib/utils';
import { normalizeCategory, RELATED_CATEGORIES } from '@/lib/constants/marketplace';

export type CreateProductResult =
    | { success: true; productId: string; }
    | { success: false; error: string; };

export async function createProductAction(
    idToken: string,
    productData: Partial<Product>
): Promise<CreateProductResult> {
    console.log('=== CREATE PRODUCT ACTION START ===');
    console.log('productData received keys:', Object.keys(productData));

    try {
        const decodedToken = await verifyIdToken(idToken);
        console.log('Token verified for UID:', decodedToken.uid);

        // 1. Rate Limiting: 20 products per hour per user
        const { rateLimit } = await import('@/lib/rate-limiter');
        const limitResult = await rateLimit(decodedToken.uid, 'create-product', 20, 3600);
        if (!limitResult.success) {
            return { success: false, error: 'Too many listings created recently. Please wait before adding more.' };
        }

        // 2. Image Domain Validation
        const allowedDomains = ['firebasestorage.googleapis.com', 'images.unsplash.com', 'storage.googleapis.com'];
        if (productData.imageUrls) {
            for (const url of productData.imageUrls) {
                try {
                    const urlObj = new URL(url);
                    if (!allowedDomains.some(domain => urlObj.hostname.includes(domain))) {
                        return { success: false, error: `Invalid image source: ${urlObj.hostname}` };
                    }
                } catch {
                    return { success: false, error: 'Invalid image URL provided.' };
                }
            }
        }

        const userRef = firestoreDb.collection('users').doc(decodedToken.uid);
        const userSnap = await userRef.get();

        const { SUPER_ADMIN_UIDS } = await import('@/lib/constants');
        const isSuperAdmin = SUPER_ADMIN_UIDS.includes(decodedToken.uid);

        let userRole = 'viewer';
        let canSell = false;
        let sellerName = 'User';
        let sellerAvatar = '';
        let sellerVerified = false;

        if (userSnap.exists) {
            const userProfile = userSnap.data() as UserProfile;
            userRole = userProfile.role || 'viewer';
            canSell = userProfile.canSell === true;
            sellerName = userProfile.displayName || 'Seller';
            sellerAvatar = userProfile.photoURL || '';
            sellerVerified = userProfile.isVerified || false;

            if (isSuperAdmin) {
                userRole = 'superadmin';
                canSell = true;
            }
        } else if (isSuperAdmin) {
            userRole = 'superadmin';
            canSell = true;
            sellerName = decodedToken.name || 'Super Admin';
            sellerAvatar = decodedToken.picture || '';
            sellerVerified = true;
        } else {
            console.error('User profile not found');
            await createUserProfile(decodedToken.uid, {
                email: decodedToken.email,
                displayName: decodedToken.name || 'User',
                role: isSuperAdmin ? 'superadmin' : 'seller',
                canSell: true,
            });
            userRole = isSuperAdmin ? 'superadmin' : 'seller';
            canSell = true;
            sellerName = decodedToken.name || 'User';
            sellerAvatar = decodedToken.picture || '';
            sellerVerified = true;
        }

        if (userRole !== 'superadmin' && userRole !== 'admin' && !canSell) {
            return { success: false, error: 'You do not have permission to list products.' };
        }

        if (userRole === 'seller') {
            const userProductsSnap = await firestoreDb.collection('products')
                .where('sellerId', '==', decodedToken.uid)
                .where('status', 'in', ['available', 'pending_approval'])
                .count()
                .get();

            if (userProductsSnap.data().count >= 20) {
                return { success: false, error: 'Personal sellers are limited to 20 active items. Upgrade to Business to list more.' };
            }
        }

        const productsCollection = firestoreDb.collection("products");
        const docRef = productsCollection.doc();

        const validationResult = productFormSchema.safeParse(productData);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${errorMessages}` };
        }

        const validData = validationResult.data;

        const finalData: Product = {
            ...validData,
            description: validData.description || '',
            id: docRef.id,
            sellerId: decodedToken.uid,
            sellerEmail: decodedToken.email || '',
            sellerName: sellerName,
            sellerAvatar: sellerAvatar,
            sellerVerified: sellerVerified,
            status: (userRole === 'admin' || userRole === 'superadmin') ? 'available' : 'pending_approval',
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
            isFeatured: false,
            isPromoted: false,
            views: 0,
            uniqueViews: 0,
        };

        if (validData.imageUrls && validData.imageUrls.length > 0) {
            try {
                console.log('Running AI Intelligence Pipeline for product:', validData.title);
                const { analyzeProductImage } = await import('../system/ai-images');
                const analysisPromises = validData.imageUrls.map(url =>
                    analyzeProductImage(url, validData.title)
                );
                const analysisResults = await Promise.all(analysisPromises);

                finalData.aiIntelligence = analysisResults;
                finalData.imageAltTexts = analysisResults.map(r => r.altText);
                finalData.qualityScore = Math.min(...analysisResults.map(r => r.qualityScore));
                finalData.isSafe = analysisResults.every(r => r.isSafe);

                if (!finalData.isSafe) {
                    finalData.safetyReason = analysisResults.find(r => !r.isSafe)?.safetyReason;
                    finalData.status = 'on_hold';
                }

                const firstResult = analysisResults[0];
                if (firstResult.detectedAttributes) {
                    finalData.detectedAttributes = firstResult.detectedAttributes;
                    if (!finalData.year) finalData.year = firstResult.detectedAttributes.year || undefined;
                    if (!finalData.manufacturer) finalData.manufacturer = firstResult.detectedAttributes.brand || undefined;
                }
            } catch (error) {
                console.warn('AI Pipeline failed:', error);
                finalData.imageAltTexts = validData.imageUrls.map(() => validData.title);
            }
        }

        (finalData as any).title_lowercase = validData.title.toLowerCase();
        const keywords = generateKeywords(validData.title);
        if (validData.brand) keywords.push(...generateKeywords(validData.brand));
        if (validData.subCategory) keywords.push(...generateKeywords(validData.subCategory));
        if (validData.category) keywords.push(...generateKeywords(validData.category));
        if (validData.description) keywords.push(...generateKeywords(validData.description));
        (finalData as any).keywords = [...new Set(keywords)];

        await docRef.set(finalData);
        console.log('Product saved:', docRef.id);

        revalidatePath('/browse');
        revalidatePath(`/product/${docRef.id}`);
        revalidateTag('active-listings-count');
        revalidateTag('products-featured');
        revalidateTag('products-sneakers');

        return { success: true, productId: docRef.id };

    } catch (error: any) {
        console.error("Error in createProductAction:", error);
        return { success: false, error: error.message || 'An unexpected error occurred.' };
    }
}

export async function createBulkProductsAction(
    idToken: string,
    productsData: Partial<Product>[]
): Promise<{ success: true; count: number } | { success: false; error: string }> {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const productsCollection = firestoreDb.collection("products");
        const batch = firestoreDb.batch();

        for (const data of productsData) {
            const docRef = productsCollection.doc();
            const finalData = {
                ...data,
                id: docRef.id,
                sellerId: decodedToken.uid,
                sellerEmail: decodedToken.email || '',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'available',
                views: 0,
                uniqueViews: 0,
            };
            batch.set(docRef, finalData);
        }

        await batch.commit();
        revalidatePath('/browse');
        revalidateTag('active-listings-count');
        revalidateTag('products-featured');
        revalidateTag('products-sneakers');

        return { success: true, count: productsData.length };
    } catch (error: any) {
        console.error("Bulk Create Error:", error);
        return { success: false, error: error.message };
    }
}

export async function recordProductView(productId: string, userId?: string) {
    const productRef = firestoreDb.collection('products').doc(productId);

    return firestoreDb.runTransaction(async (transaction: any) => {
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
            return;
        }

        const updates: any = {
            views: admin.firestore.FieldValue.increment(1),
            lastViewedTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (userId) {
            const viewRef = productRef.collection('views').doc(userId);
            const viewDoc = await transaction.get(viewRef);

            if (!viewDoc.exists) {
                updates.uniqueViews = admin.firestore.FieldValue.increment(1);
                transaction.set(viewRef, {
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    userId: userId
                });
            } else {
                transaction.update(viewRef, {
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        transaction.update(productRef, updates);
    });
}

export async function getRecentViewCount(productId: string, hours: number = 24) {
    try {
        const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

        const viewsSnap = await firestoreDb
            .collection('products')
            .doc(productId)
            .collection('views')
            .where('timestamp', '>=', threshold)
            .count()
            .get();

        return viewsSnap.data().count;
    } catch (error) {
        console.error('Error fetching recent view count:', error);
        return 0;
    }
}

export async function getAdjacentProducts(currentId: string, createdAt: any) {
    try {
        const productsRef = firestoreDb.collection('products');
        let timestamp;
        if (createdAt && typeof createdAt.toDate === 'function') {
            timestamp = createdAt;
        } else if (createdAt && createdAt.seconds) {
            timestamp = admin.firestore.Timestamp.fromMillis(createdAt.seconds * 1000);
        } else if (createdAt && createdAt.value) {
            timestamp = admin.firestore.Timestamp.fromDate(new Date(createdAt.value));
        } else if (createdAt instanceof Date) {
            timestamp = admin.firestore.Timestamp.fromDate(createdAt);
        } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
            timestamp = admin.firestore.Timestamp.fromDate(new Date(createdAt));
        } else {
            return { prevId: null, nextId: null };
        }

        const prevSnap = await productsRef
            .where('createdAt', '>', timestamp)
            .orderBy('createdAt', 'asc')
            .limit(5)
            .get();

        const nextSnap = await productsRef
            .where('createdAt', '<', timestamp)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();

        const findFirstAvailable = (docs: admin.firestore.QueryDocumentSnapshot[]) => {
            const match = docs.find(doc => doc.data().status === 'available');
            return match ? match.id : null;
        };

        return {
            prevId: findFirstAvailable(prevSnap.docs),
            nextId: findFirstAvailable(nextSnap.docs)
        };
    } catch (error) {
        console.error("Error fetching adjacent products:", error);
        return { prevId: null, nextId: null };
    }
}

export const getFeaturedProducts = unstable_cache(
    async (limitCount: number = 8): Promise<Product[]> => {
        const { isFirebaseAdminReady } = await import('@/lib/firebase/admin');
        try {
            try {
                const snapshot = await firestoreDb.collection('products')
                    .where('status', '==', 'available')
                    .orderBy('createdAt', 'desc')
                    .limit(limitCount)
                    .get();

                if (!snapshot.empty) {
                    return snapshot.docs.map((doc: any) => serializeFirestoreData({
                        id: doc.id,
                        ...doc.data(),
                    })) as Product[];
                }
            } catch (indexError: any) {
                console.warn("Featured products optimal query failed, falling back.");
            }

            const fallbackSnapshot = await firestoreDb.collection('products')
                .where('status', '==', 'available')
                .limit(limitCount)
                .get();

            return fallbackSnapshot.docs.map((doc: any) => serializeFirestoreData({
                id: doc.id,
                ...doc.data(),
            })) as Product[];
        } catch (error) {
            console.error("Error fetching featured products:", error);
            return [];
        }
    },
    ['products-featured'],
    { revalidate: 1, tags: ['products-featured'] }
);

function generateKeywords(text: string): string[] {
    if (!text) return [];
    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length >= 2);
    const keywords: string[] = [];
    words.forEach(word => keywords.push(word));
    if (text.length < 50) keywords.push(text.toLowerCase().trim());
    return [...new Set(keywords)];
}

const ACTIVE_CATEGORIES = [
    'Sneakers', 'Shoes', 'shoes', 'sneakers',
    'Collector Cards', 'Trading Cards', 'Cards', 'collector-cards', 'trading-cards',
    'Accessories', 'Apparel'
];

export const getActiveProducts = unstable_cache(
    async (limitCount: number = 20): Promise<Product[]> => {
        try {
            try {
                const snapshot = await firestoreDb.collection('products')
                    .where('category', 'in', ACTIVE_CATEGORIES)
                    .where('status', '==', 'available')
                    .orderBy('createdAt', 'desc')
                    .limit(limitCount)
                    .get();

                return snapshot.docs.map((doc: any) => serializeFirestoreData({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];
            } catch (indexError) {
                const fallbackSnapshot = await firestoreDb.collection('products')
                    .where('status', '==', 'available')
                    .limit(limitCount)
                    .get();
                return fallbackSnapshot.docs.map((doc: any) => serializeFirestoreData({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];
            }
        } catch (error) {
            console.error("Error fetching active products:", error);
            return [];
        }
    },
    ['products-sneakers'],
    { revalidate: 1, tags: ['products-sneakers'] }
);

export const getActiveListingCount = unstable_cache(
    async (): Promise<number> => {
        try {
            const snapshot = await firestoreDb.collection('products')
                .where('status', '==', 'available')
                .count()
                .get();
            return snapshot.data().count;
        } catch (error: any) {
            console.error(`[getActiveListingCount] Error: ${error.message}`);
            return 0;
        }
    },
    ['active-listings-count'],
    { revalidate: 1, tags: ['active-listings-count'] }
);

export const getSimilarProductsByCategory = unstable_cache(
    async (currentId: string, category: string, limitCount: number = 8): Promise<Product[]> => {
        try {
            const normalized = normalizeCategory(category);
            const related = RELATED_CATEGORIES[normalized] || [category];

            try {
                const snapshot = await firestoreDb.collection('products')
                    .where('category', 'in', related)
                    .where('status', '==', 'available')
                    .orderBy('createdAt', 'desc')
                    .limit(limitCount + 1)
                    .get();

                let products = snapshot.docs.map((doc: any) => serializeFirestoreData({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];

                return products.filter(p => p.id !== currentId).slice(0, limitCount);
            } catch (indexError) {
                const fallbackSnapshot = await firestoreDb.collection('products')
                    .where('category', 'in', related)
                    .where('status', '==', 'available')
                    .limit(limitCount + 10)
                    .get();

                let products = fallbackSnapshot.docs.map((doc: any) => serializeFirestoreData({
                    id: doc.id,
                    ...doc.data(),
                })) as Product[];

                return products.filter(p => p.id !== currentId).slice(0, limitCount);
            }
        } catch (error) {
            console.error("Error fetching similar products:", error);
            return [];
        }
    },
    ['similar-products-category'],
    { revalidate: 3600 }
);