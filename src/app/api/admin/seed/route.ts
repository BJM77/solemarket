
import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb, auth } from '@/lib/firebase/admin';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Product } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';
import { MARKETPLACE_CATEGORIES } from '@/config/categories';

export async function POST(request: NextRequest) {
    // 1. Critical Production Gate
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Forbidden in production' }, { status: 403 });
    }

    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.ADMIN_SEED_TOKEN) {
            return NextResponse.json({ error: 'Unauthorized: Invalid or missing seed token' }, { status: 401 });
        }

        // Seed Categories
        const categoryBatch = firestoreDb.batch();
        for (const cat of MARKETPLACE_CATEGORIES) {
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
                isAuction: false,
                isFeatured: false,
                isPromoted: false,
                views: 0,
                title_lowercase: 'air jordan 1 retro high og "chicago"',
                keywords: ['jordan', 'nike', 'chicago', 'retro', 'high', 'og']
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
                isAuction: false,
                isFeatured: false,
                isPromoted: false,
                views: 0,
                title_lowercase: 'adidas yeezy boost 350 v2 "zebra"',
                keywords: ['adidas', 'yeezy', '350', 'v2', 'zebra', 'boost']
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
            message: `Seeded ${MARKETPLACE_CATEGORIES.length} categories and ${products.length} products.`,
            details: { categories: MARKETPLACE_CATEGORIES.length, products: products.length }
        });

    } catch (error: any) {
        console.error('Seeding failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
