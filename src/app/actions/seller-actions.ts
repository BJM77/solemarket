'use server';

import { firestoreDb } from "@/lib/firebase/admin";
import { UserProfile, Product } from "@/lib/types";
import { serializeFirestoreData } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";

/**
 * Helper to get the authenticated user's ID from the session cookie.
 */
async function getUserIdFromSession(): Promise<string | null> {
    const cookieStore = await cookies();
    const session = cookieStore.get('session') || cookieStore.get('__session');

    if (session?.value) {
        try {
            const decoded = jwtDecode(session.value) as any;
            return decoded.user_id || decoded.sub || null;
        } catch (error) {
            return null;
        }
    }
    return null;
}

export type SellerWithCategories = UserProfile & {
    categories: string[];
    productCount: number;
};

export async function getSellersAction(): Promise<SellerWithCategories[]> {
    try {
        const db = firestoreDb;

        // 1. Fetch users who are sellers
        // Note: This assumes you have 'role' set to 'seller' or 'business'
        // If not consistent, we might need multiple queries or filtered in memory if filtered by accountType
        const sellersSnapshot = await db.collection('users')
            .where('role', 'in', ['seller', 'business', 'admin', 'superadmin'])
            .limit(50) // reasonable limit for now
            .get();

        // Also try filtering by accountType if role isn't universally used yet
        // const accountTypeSnapshot = await db.collection('users').where('accountType', '==', 'seller').get();

        // Deduplicate if we did multiple queries (skipping for now, trusting role)

        const sellers: SellerWithCategories[] = [];

        // 2. For each seller, fetch their categories
        // Use Promise.all for concurrency
        await Promise.all(sellersSnapshot.docs.map(async (doc: any) => {
            const userData = doc.data() as UserProfile;

            if (!doc.id) return;

            // Basic check to ensure they actually look like a seller (have a store name or are verified)
            // or just list them all. User request implies "list of sellers".

            // Fetch a few products to check categories
            const productsSnapshot = await db.collection('products')
                .where('sellerId', '==', doc.id)
                .where('status', '==', 'available')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            if (productsSnapshot.empty) {
                // If no products, maybe don't show them? Or show with "No items"
                // User asked "show... categories available", implying only active sellers.
                return;
            }

            const products = productsSnapshot.docs.map((p: any) => p.data() as Product);
            const categorySet = new Set<string>();
            products.forEach((p: Product) => {
                if (p.category) categorySet.add(p.category);
            });

            sellers.push({
                ...(serializeFirestoreData(userData) as UserProfile),
                id: doc.id,
                categories: Array.from(categorySet),
                productCount: productsSnapshot.size // This is just the limit size, ideally count()
            });
        }));

        return sellers;
    } catch (error) {
        console.error("Error fetching sellers:", error);
        return [];
    }
}

export async function markAsSold(productId: string, fulfillmentType: string) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) return { success: false, error: 'Product not found' };

        const productData = productSnap.data() as Product;
        if (productData.sellerId !== userId) {
            return { success: false, error: 'You do not have permission to modify this listing.' };
        }

        await productRef.update({
            status: 'sold',
            fulfillmentStatus: fulfillmentType,
            soldAt: new Date(),
        });
        revalidatePath('/sell/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error marking product as sold:', error);
        return { success: false, error: 'Failed to mark as sold' };
    }
}

export async function deleteListing(productId: string) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) return { success: false, error: 'Product not found' };

        const productData = productSnap.data() as Product;
        if (productData.sellerId !== userId) {
            return { success: false, error: 'You do not have permission to delete this listing.' };
        }

        await productRef.delete();
        revalidatePath('/sell/dashboard');
        return { success: true };
    } catch (error) {
        console.error('Error deleting product:', error);
        return { success: false, error: 'Failed to delete listing' };
    }
}

export async function updateListing(productId: string, data: any) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) return { success: false, error: 'Product not found' };

        const productData = productSnap.data() as Product;
        if (productData.sellerId !== userId) {
            return { success: false, error: 'You do not have permission to update this listing.' };
        }

        await productRef.update({
            ...data,
            updatedAt: new Date(),
        });
        revalidatePath('/sell/dashboard');
        revalidatePath(`/product/${productId}`);
        return { success: true };
    } catch (error) {
        console.error('Error updating product:', error);
        return { success: false, error: 'Failed to update listing' };
    }
}

export async function republishListing(productId: string) {
    try {
        const userId = await getUserIdFromSession();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const productRef = firestoreDb.collection('products').doc(productId);
        const productSnap = await productRef.get();
        if (!productSnap.exists) return { success: false, error: 'Product not found' };

        const productData = productSnap.data() as Product;
        if (productData.sellerId !== userId) {
            return { success: false, error: 'You do not have permission to republish this listing.' };
        }

        await productRef.update({
            status: 'available', // Or 'active' depending on your schema. Using 'available' based on previous context.
            updatedAt: new Date(),
            soldAt: null, // Clear the sold date
            fulfillmentStatus: null // Clear fulfillment status
        });
        revalidatePath('/sell/dashboard');
        revalidatePath(`/product/${productId}`);
        return { success: true };
    } catch (error) {
        console.error('Error republishing product:', error);
        return { success: false, error: 'Failed to republish listing' };
    }
}
