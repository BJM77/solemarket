'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { Product } from '@/lib/types';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import Papa from 'papaparse';

export async function exportAllProductsCSV(idToken: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const { role } = decodedToken;

        if (role !== 'admin' && role !== 'superadmin') {
            throw new Error('Unauthorized');
        }

        const snapshot = await firestoreDb.collection('products').get();
        const products = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
            const data = doc.data() as Product;
            return {
                id: doc.id,
                title: data.title,
                price: data.price,
                seller: data.sellerName,
                status: data.status,
                category: data.category,
                createdAt: data.createdAt ? (data.createdAt as any).toDate().toISOString() : '',
                description: data.description ? data.description.substring(0, 100).replace(/(\r\n|\n|\r)/gm, " ") : '', // Truncate and clean for CSV
                imageUrl: data.imageUrls?.[0] || '',
                views: data.views || 0,
            };
        });

        const csv = Papa.unparse(products);
        return { csv };

    } catch (error: any) {
        console.error('Export failed:', error);
        return { error: error.message || 'Failed to export products.' };
    }
}
