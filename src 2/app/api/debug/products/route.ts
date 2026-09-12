import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { authAdmin } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
    // 1. Production Gate
    if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    try {
        // 2. Admin Check
        const session = request.cookies.get('session')?.value || request.cookies.get('__session')?.value;
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        
        const decodedToken = await authAdmin.verifySessionCookie(session);
        if (decodedToken.role !== 'admin' && decodedToken.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const productsRef = collection(db, 'products');
        const q = query(productsRef, limit(20));
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
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
