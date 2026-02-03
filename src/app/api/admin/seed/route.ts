
import { NextRequest, NextResponse } from 'next/server';
import { firestoreDb, auth } from '@/lib/firebase/admin';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Product, Category } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.split('Bearer ')[1];

        // Validate token
        try {
            await auth.verifyIdToken(token);
            // Could check for admin role here
        } catch (e) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
        }

        // Seed Categories
        const categories: Category[] = [
            { id: 'cat_cards', name: 'Trading Cards', description: 'Collectible trading cards', imageUrl: PlaceHolderImages.find(i => i.id === 'category-cards')?.imageUrl, slug: 'trading-cards', section: 'Marketplace' },
            { id: 'cat_coins', name: 'Coins & Paper Money', description: 'Rare coins and currency', imageUrl: PlaceHolderImages.find(i => i.id === 'category-coins')?.imageUrl, slug: 'coins-paper-money', section: 'Marketplace' },
            { id: 'cat_comics', name: 'Comics', description: 'Vintage and modern comics', imageUrl: PlaceHolderImages.find(i => i.id === 'product-comic-1')?.imageUrl, slug: 'comics', section: 'Marketplace' },
            { id: 'cat_memorabilia', name: 'Sports Memorabilia', description: 'Signed gear and apparel', imageUrl: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl, slug: 'sports-memorabilia', section: 'Marketplace' },
        ];

        const categoryBatch = firestoreDb.batch();
        for (const cat of categories) {
            categoryBatch.set(firestoreDb.collection('categories').doc(cat.id), cat, { merge: true });
        }
        await categoryBatch.commit();

        // Seed Products
        // Using a dummy user ID for the "Picksy Official" seller
        const sellerId = 'picksy-official';

        // Create the seller profile if it doesn't exist
        await firestoreDb.collection('users').doc(sellerId).set({
            uid: sellerId,
            displayName: 'Picksy Official',
            email: 'official@picksy.au',
            photoURL: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl,
            role: 'admin',
            createdAt: Timestamp.now(),
            isVerified: true,
            rating: 5.0,
            totalSales: 100
        }, { merge: true });

        const products: Partial<Product>[] = [
            {
                id: 'prod_card_1',
                title: 'Rare Dragon Trading Card (Holo)',
                description: 'A pristine condition holographic dragon card. Extremely rare find.',
                price: 1250,
                category: 'Trading Cards',
                sellerId: sellerId,
                sellerName: 'Picksy Official',
                sellerEmail: 'official@picksy.au',
                sellerAvatar: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl || '',
                imageUrls: [PlaceHolderImages.find(i => i.id === 'product-card-1')?.imageUrl || ''],
                status: 'available',
                condition: 'Mint',
                year: 2023,
                manufacturer: 'Fantasy TCG',
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                isAuction: false
            },
            {
                id: 'prod_coin_1',
                title: 'Ancient Roman Silver Denarius',
                description: 'Authentic silver Denarius from the Roman Empire. Certified.',
                price: 450,
                category: 'Coins & Paper Money',
                sellerId: sellerId,
                sellerName: 'Picksy Official',
                sellerEmail: 'official@picksy.au',
                sellerAvatar: PlaceHolderImages.find(i => i.id === 'hero')?.imageUrl || '',
                imageUrls: [PlaceHolderImages.find(i => i.id === 'product-coin-1')?.imageUrl || ''],
                status: 'available',
                condition: 'Good',
                year: 200, // Approximate
                createdAt: Timestamp.now() as any,
                updatedAt: Timestamp.now() as any,
                isAuction: true,
                startingBid: 300,
                currentBid: 300,
                auctionEndTime: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) as any // 7 days
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
            message: `Seeded ${categories.length} categories and ${products.length} products.`,
            details: { categories: categories.length, products: products.length }
        });

    } catch (error: any) {
        console.error('Seeding failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
