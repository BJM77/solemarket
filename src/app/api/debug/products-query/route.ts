
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

export async function GET() {
    try {
        const productsRef = collection(db, 'products');
        // Mimic the Default Public Query
        // status == 'available'
        // orderBy createdAt desc
        const q = query(
            productsRef,
            where('status', '==', 'available'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);

        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({
            count: products.length,
            products: products
        });
    } catch (error: any) {
        return NextResponse.json({
            error: error.message,
            code: error.code,
            details: 'Likely missing index or permission issue.'
        }, { status: 500 });
    }
}
