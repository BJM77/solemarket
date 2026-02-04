'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { getAllUsers, AdminUser } from './admin-users';
import { Product } from '@/lib/types';
import { serializeFirestoreData } from '@/lib/utils';

export async function getSellersAndBusinessUsers(idToken: string): Promise<{ users: AdminUser[], error?: string }> {
    const result = await getAllUsers(idToken);
    if (result.error) return { users: [], error: result.error };

    const filtered = result.users?.filter(u => u.role === 'seller' || u.role === 'business') || [];
    return { users: filtered };
}

export async function getSellerProducts(idToken: string, sellerId: string): Promise<{ products: Product[], error?: string }> {
    try {
        const decoded = await verifyIdToken(idToken);
        if (decoded.role !== 'superadmin' && decoded.role !== 'admin') {
            return { products: [], error: 'Unauthorized' };
        }

        const snapshot = await firestoreDb.collection('products')
            .where('sellerId', '==', sellerId)
            .orderBy('createdAt', 'desc')
            .get();

        const products = snapshot.docs.map(doc => serializeFirestoreData({
            id: doc.id,
            ...doc.data()
        })) as Product[];

        return { products };
    } catch (error: any) {
        console.error("Error fetching seller products:", error);
        return { products: [], error: error.message };
    }
}
