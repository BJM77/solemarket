'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { Product } from '@/lib/types';
import * as admin from 'firebase-admin';
import { createDeal } from '../admin/deals/actions';

export async function seedTestDeal() {
    try {
        // Check if deal exists
        const snapshot = await firestoreDb.collection('deals').where('name', '==', 'Test Starter Bundle').get();
        if (!snapshot.empty) return { success: true, message: 'Deal already exists' };

        await createDeal({
            name: 'Test Starter Bundle',
            description: 'Build a bundle with 1 Platinum, 1 Gold, 1 Silver, and 1 Bronze item.',
            price: 150.00,
            requirements: {
                platinum: 1,
                gold: 1,
                silver: 1,
                bronze: 1
            },
            isActive: true,
            code: 'TESTBUNDLE',
            createdBy: 'test-seed'

        });
        return { success: true, message: 'Deal created' };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}


export async function seedTestProducts() {
    try {
        const timestamp = admin.firestore.Timestamp.now();
        const sellerId = 'TEST_SELLER_ID'; // We might need a real ID if auth checks are strict, but for admin write it's fine.

        // We'll use a hardcoded image for now or a placeholder
        const placeholderImage = 'https://placehold.co/400x600/png?text=Card+Back';

        const items = [
            {
                title: 'Test Bronze Item (Auto-Tier)',
                price: 4.00,
                description: 'A bronze tier item for testing ($4.00). Should be Bronze in Bundle Deals.',
                tier: 'bronze'
            },
            {
                title: 'Test Silver Item (Auto-Tier)',
                price: 15.00,
                description: 'A silver tier item for testing ($15.00). Should be Silver in Bundle Deals.',
                tier: 'silver'
            },
            {
                title: 'Test Gold Item (Auto-Tier)',
                price: 40.00,
                description: 'A gold tier item for testing ($40.00). Should be Gold in Bundle Deals.',
                tier: 'gold'
            },
            {
                title: 'Test Platinum Item (Auto-Tier)',
                price: 100.00,
                description: 'A platinum tier item for testing ($100.00). Should be Platinum in Bundle Deals.',
                tier: 'platinum'
            }
        ];

        const batch = firestoreDb.batch();

        for (const item of items) {
            const docRef = firestoreDb.collection('products').doc();

            const product: Partial<Product> = {
                id: docRef.id,
                title: item.title,
                description: item.description,
                price: item.price,
                category: 'Collector Cards', // Use Cards so it appears in Multicard deals
                subCategory: 'Trading Cards',
                status: 'available',
                sellerId: 'test-admin-seeder',
                sellerName: 'Test Seeder',
                sellerEmail: 'test@example.com',
                sellerVerified: true,
                imageUrls: [placeholderImage],
                createdAt: timestamp as any,
                updatedAt: timestamp as any,
                multibuyEnabled: true,
                multibuyTiers: [
                    { minQuantity: 2, discountPercent: 10 },
                    { minQuantity: 4, discountPercent: 20 }
                ],
                // Explicitly set the tier match the new logic just in case, 
                // but the system should usually auto-classify. 
                // We'll set it here to ensure the test works immediately without waiting for a background trigger.
                // Note: The field name in types.ts for tiers 'bronze' | 'silver' etc needed validation. 
                // Let's check types.ts. It was `multiCardTier`.
                // Checking types.ts content from history... `multiCardTier: MultiCardTier`
                multiCardTier: item.tier as any
            };

            batch.set(docRef, product);
        }

        await batch.commit();

        // Also seed the deal
        await seedTestDeal();

        return { success: true };
    } catch (error: any) {
        console.error('Seed error:', error);
        return { success: false, error: error.message };
    }
}
