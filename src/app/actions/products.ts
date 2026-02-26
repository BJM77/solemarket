'use server';

import * as admin from 'firebase-admin';
import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { createUserProfile } from '@/lib/firebase/client-ops';
import type { Product, UserProfile } from '@/lib/types';
import { revalidatePath, unstable_cache } from 'next/cache';
import { productFormSchema } from '@/schemas/product';
import { serializeFirestoreData } from '@/lib/utils';

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
            // Create a minimal profile for superadmin or fallback seller
            await createUserProfile(decodedToken.uid, {
                email: decodedToken.email,
                displayName: decodedToken.name || 'User',
                role: isSuperAdmin ? 'superadmin' : 'seller',
                canSell: true,
            });
            // Set defaults for the newly created profile
            userRole = isSuperAdmin ? 'superadmin' : 'seller';
            canSell = true;
            sellerName = decodedToken.name || 'User';
            sellerAvatar = decodedToken.picture || '';
            sellerVerified = true;
            // Continue processing without returning error
        }

        // Check for permission to sell
        if (userRole !== 'superadmin' && userRole !== 'admin' && !canSell) {
            return { success: false, error: 'You do not have permission to list products.' };
        }

        // Limit check for personal sellers
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
        const docRef = productsCollection.doc(); // Auto-generate ID

        const validationResult = productFormSchema.safeParse(productData);
        if (!validationResult.success) {
            const errorMessages = validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
            return { success: false, error: `Validation Failed: ${errorMessages}` };
        }

        const validData = validationResult.data;

        const finalData: Product = {
            ...validData,
            id: docRef.id,
            sellerId: decodedToken.uid,
            sellerEmail: decodedToken.email || '',
            sellerName: sellerName,
            sellerAvatar: sellerAvatar,
            sellerVerified: sellerVerified,
            // All new listings require approval
            status: 'pending_approval',
            createdAt: admin.firestore.FieldValue.serverTimestamp() as any,
            updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,

            // Default visibility fields for sorting/indexing
            isFeatured: false,
            isPromoted: false,
            views: 0,
            uniqueViews: 0,
        };

        // Pillar 1: AI Visual SEO & Moderation Pipeline
        if (validData.imageUrls && validData.imageUrls.length > 0) {
            try {
                console.log('Running AI Intelligence Pipeline for product:', validData.title);
                const { analyzeProductImage } = await import('./ai-images');
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
                    finalData.status = 'on_hold'; // Flag for manual review if unsafe
                }

                // Merge detected attributes if not already provided
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

        // Search helpers & Normalization (Pillar 2/3)
        (finalData as any).title_lowercase = validData.title.toLowerCase();
        (finalData as any).keywords = generateKeywords(validData.title);

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
                // New unique viewer
                updates.uniqueViews = admin.firestore.FieldValue.increment(1);
                transaction.set(viewRef, {
                    timestamp: admin.firestore.FieldValue.serverTimestamp(),
                    userId: userId
                });
            } else {
                // Update timestamp for returning user (optional, but good for "last seen")
                transaction.update(viewRef, {
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        transaction.update(productRef, updates);
    });
}

/**
 * Gets the number of unique views for a product in the last X hours
 * Uses the efficient Firestore count() query on the 'views' subcollection.
 */
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

        // Parse createdAt
        let timestamp;
        if (createdAt && typeof createdAt.toDate === 'function') {
            timestamp = createdAt;
        } else if (createdAt && createdAt.seconds) {
            timestamp = admin.firestore.Timestamp.fromMillis(createdAt.seconds * 1000);
        } else if (createdAt instanceof Date) {
            timestamp = admin.firestore.Timestamp.fromDate(createdAt);
        } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
            timestamp = admin.firestore.Timestamp.fromDate(new Date(createdAt));
        } else {
            return { prevId: null, nextId: null };
        }

        // We fetch multiple neighboring items and filter for 'available' status in memory
        // to avoid requiring a composite index on (status, createdAt).
        // This is much more robust for dynamic filtering.

        // Previous (Newer items)
        const prevSnap = await productsRef
            .where('createdAt', '>', timestamp)
            .orderBy('createdAt', 'asc')
            .limit(5)
            .get();

        // Next (Older items)
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
        try {
            // Try the optimal query first (requires composite index)
            try {
                const snapshot = await firestoreDb.collection('products')
                    .where('status', '==', 'available')
                    .orderBy('isPromoted', 'desc')
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
                console.warn("Featured products optimal query failed (likely missing index), falling back to simple query.");
            }

            // Fallback: simple query that doesn't need composite index
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
    { revalidate: 300, tags: ['products-featured'] }
);

function generateKeywords(title: string): string[] {
    const words = title.toLowerCase().split(/\s+/);
    const keywords: string[] = [];

    // Generate all substrings for prefix search within words (expensive but effective for "Jord" matching "Jordan")
    // For now, let's just save full words for 'array-contains' search
    // Filter out short words? No, "MJ" is relevant.

    words.forEach(word => {
        const cleanWord = word.replace(/[^a-z0-9]/g, '');
        if (cleanWord.length > 0) {
            keywords.push(cleanWord);
        }
    });

    // Also include the full title lowercase for prefix sorting
    keywords.push(title.toLowerCase());

    return [...new Set(keywords)]; // Unique
}

const ACTIVE_CATEGORIES = ['Sneakers', 'Trading Cards', 'Accessories', 'Apparel'];

export const getActiveProducts = unstable_cache(
    async (limitCount: number = 20): Promise<Product[]> => {
        try {
            const snapshot = await firestoreDb.collection('products')
                .where('category', 'in', ACTIVE_CATEGORIES)
                .where('status', '==', 'available')
                .orderBy('isPromoted', 'desc')
                .orderBy('createdAt', 'desc')
                .limit(limitCount)
                .get();

            return snapshot.docs.map((doc: any) => serializeFirestoreData({
                id: doc.id,
                ...doc.data(),
            })) as Product[];
        } catch (error) {
            console.debug("Error fetching sneakers (Locally missing Admin service account expected):", error);
            return [];
        }
    },
    ['products-sneakers'],
    { revalidate: 300, tags: ['products-sneakers'] }
);

export const getActiveListingCount = unstable_cache(
    async (): Promise<number> => {
        try {
            const snapshot = await firestoreDb.collection('products')
                .where('status', '==', 'available')
                .count()
                .get();

            return snapshot.data().count;
        } catch (error) {
            console.debug("Error fetching active listing count (Locally missing Admin service account expected):", error);
            return 0;
        }
    },
    ['active-listings-count'],
    { revalidate: 600, tags: ['active-listings-count'] }
);

export const getSimilarProductsByCategory = unstable_cache(
    async (currentId: string, category: string, limitCount: number = 8): Promise<Product[]> => {
        try {
            const snapshot = await firestoreDb.collection('products')
                .where('category', '==', category)
                .where('status', '==', 'available')
                .orderBy('createdAt', 'desc')
                .limit(limitCount + 1) // Fetch +1 to filter out currentId locally
                .get();

            let products = snapshot.docs.map((doc: any) => serializeFirestoreData({
                id: doc.id,
                ...doc.data(),
            })) as Product[];

            // Filter out the current product and slice to the requested limit
            return products.filter(p => p.id !== currentId).slice(0, limitCount);
        } catch (error) {
            console.error("Error fetching similar products:", error);
            return [];
        }
    },
    ['similar-products-category'],
    { revalidate: 3600 }
);