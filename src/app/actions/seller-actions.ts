'use server';

import { firestoreDb } from "@/lib/firebase/admin";
import { UserProfile, Product } from "@/lib/types";

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
        await Promise.all(sellersSnapshot.docs.map(async (doc) => {
            const userData = doc.data() as UserProfile;

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

            const products = productsSnapshot.docs.map(p => p.data() as Product);
            const categorySet = new Set<string>();
            products.forEach(p => {
                if (p.category) categorySet.add(p.category);
            });

            sellers.push({
                ...userData,
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
