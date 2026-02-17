'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Product } from '@/lib/types';
import { SNEAKER_CATEGORIES } from '@/config/categories';

/**
 * Server Action to seed the database with sample sneaker listings.
 * Only available to admins.
 */

const SAMPLE_SNEAKERS: Partial<Product>[] = [
    {
        title: "Air Jordan 1 Retro High OG 'Chicago Reimagined'",
        description: "The Air Jordan 1 Retro High OG 'Chicago Reimagined' brings back the classic colorway with a vintage look. Features cracked leather accents and a pre-yellowed midsole for that aged aesthetic. A must-have for any collector.",
        price: 450,
        category: "cat_sneakers",
        subCategory: "sub_men_sneakers",
        brand: "Air Jordan",
        model: "Air Jordan 1",
        styleCode: "DZ5485-612",
        colorway: "Varsity Red/Black/Sail/Muslin",
        size: "US 10",
        condition: "New",
        conditionDescription: "Brand new in box, never worn. Includes extra laces.",
        imageUrls: [
            "https://firebasestorage.googleapis.com/v0/b/studio-3973035687-658c0.firebasestorage.app/o/placeholders%2Fjordan1-chicago.jpg?alt=media",
        ],
        status: "available",
        sellerName: "Benched Vault",
        sellerVerified: true,
        year: 2022,
        quantity: 1
    },
    {
        title: "Adidas Yeezy Boost 350 V2 'Zebra'",
        description: "One of the most iconic Yeezy releases, the 'Zebra' 350 V2 features a black and white Primeknit upper with the distinct SPLY-350 branding in red. Boost cushioning provides unmatched comfort.",
        price: 380,
        category: "cat_sneakers",
        subCategory: "sub_men_sneakers",
        brand: "Adidas",
        model: "Yeezy Boost 350 V2",
        styleCode: "CP9654",
        colorway: "White/Core Black/Red",
        size: "US 9.5",
        condition: "New",
        conditionDescription: "Deadstock condition.",
        imageUrls: [
            "https://firebasestorage.googleapis.com/v0/b/studio-3973035687-658c0.firebasestorage.app/o/placeholders%2Fyeezy-zebra.jpg?alt=media",
        ],
        status: "available",
        sellerName: "Hype Beast",
        sellerVerified: false,
        year: 2017,
        quantity: 1
    },
    {
        title: "Nike Dunk Low 'Panda'",
        description: "The classic black and white colorway that took the world by storm. Versatile, clean, and essential for any rotation.",
        price: 180,
        category: "cat_sneakers",
        subCategory: "sub_women_sneakers",
        brand: "Nike",
        model: "Dunk Low",
        styleCode: "DD1391-100",
        colorway: "White/Black",
        size: "US 7W",
        condition: "Used",
        conditionDescription: "Worn twice, near mint condition. No creases.",
        imageUrls: [
            "https://firebasestorage.googleapis.com/v0/b/studio-3973035687-658c0.firebasestorage.app/o/placeholders%2Fdunk-panda.jpg?alt=media",
        ],
        status: "available",
        sellerName: "Benched Vault",
        sellerVerified: true,
        year: 2021,
        quantity: 1
    }
];

export async function seedSneakers(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        const batch = firestoreDb.batch();
        const results: string[] = [];

        // 1. Create a default seller profile if needed (omitted for now, assuming sellerId exists or we use admin's)
        const sellerId = decodedToken.uid;
        const sellerEmail = decodedToken.email || 'admin@benched.au';

        for (const sneaker of SAMPLE_SNEAKERS) {
            const docRef = firestoreDb.collection('products').doc();

            const productData: Product = {
                id: docRef.id,
                ...sneaker as any, // Cast to avoid partial issues, we fill the rest below
                sellerId: sellerId,
                sellerEmail: sellerEmail,
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now(),
                isDraft: false,
                isAuction: false,
                views: 0,
                uniqueViews: 0,
                keywords: [
                    sneaker.brand?.toLowerCase() || '',
                    sneaker.model?.toLowerCase() || '',
                    'sneaker',
                    sneaker.colorway?.toLowerCase() || ''
                ].filter(k => k !== '')
            };

            batch.set(docRef, productData);
            results.push(productData.title);
        }

        await batch.commit();

        return {
            success: true,
            message: `Successfully seeded ${results.length} sneakers: ${results.join(', ')}`
        };

    } catch (error: any) {
        console.error('[seedSneakers] Error:', error);
        throw new Error(error.message || 'Failed to seed sneakers');
    }
}
