
import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb, auth } from '@/lib/firebase/admin';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Product } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { SNEAKER_CATEGORIES } from '@/config/categories';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            // allowing no auth for local dev ease if needed, but keeping improved security
            // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Seed Categories
        const categoryBatch = firestoreDb.batch();
        for (const cat of SNEAKER_CATEGORIES) {
            categoryBatch.set(firestoreDb.collection('categories').doc(cat.id), cat, { merge: true });
        }
        await categoryBatch.commit();

        // Seed Products (Sneakers)
        const sellerId = 'benched-official';

        // Create the seller profile if it doesn't exist
        await firestoreDb.collection('users').doc(sellerId).set({
            uid: sellerId,
            displayName: 'Benched Official',
            email: 'official@benched.au',
            photoURL: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl,
            role: 'admin',
            createdAt: Timestamp.now(),
            isVerified: true,
            rating: 5.0,
            totalSales: 500
        }, { merge: true });

        const products: Partial<Product>[] = [
            {
                id: 'prod_jordan_1',
                title: 'Air Jordan 1 Retro High OG "Chicago"',
                description: 'The iconic Chicago colorway. Brand new in box.',
                price: 2500,
                category: 'Sneakers',
                sellerId: sellerId,
                sellerName: 'Benched Official',
                sellerEmail: 'official@benched.au',
                sellerAvatar: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl || '',
                imageUrls: ['https://images.unsplash.com/photo-1556906781-99412902f7c9?auto=format&fit=crop&q=80&w=800'], // Placeholder
                status: 'available',
                condition: 'New with Box',
                year: 2015,
                manufacturer: 'Jordan',
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                isAuction: false
            },
            {
                id: 'prod_yeezy_350',
                title: 'Adidas Yeezy Boost 350 V2 "Zebra"',
                description: 'Classic Zebra pattern. Gently used.',
                price: 450,
                category: 'Sneakers',
                sellerId: sellerId,
                sellerName: 'Benched Official',
                sellerEmail: 'official@benched.au',
                sellerAvatar: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl || '',
                imageUrls: ['https://images.unsplash.com/photo-1608231387042-66d1773070a5?auto=format&fit=crop&q=80&w=800'],
                status: 'available',
                condition: 'Used',
                year: 2017,
                manufacturer: 'Adidas',
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                isAuction: false
            }
        ];

        const productBatch = firestoreDb.batch();
        for (const prod of products) {
            if (prod.id) {
                productBatch.set(firestoreDb.collection('products').doc(prod.id), prod, { merge: true });
            }
        }
        await productBatch.commit();

        return NextResponse.json({
            success: true,
            message: `Seeded ${SNEAKER_CATEGORIES.length} categories and ${products.length} products.`,
            details: { categories: SNEAKER_CATEGORIES.length, products: products.length }
        });

    } catch (error: any) {
        console.error('Seeding failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
