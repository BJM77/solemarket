'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';
import { revalidatePath } from 'next/cache';

export async function toggleFavoriteCategory(idToken: string, categoryId: string, categoryName: string, categoryHref: string) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const favRef = firestoreDb.collection('users').doc(userId).collection('favorite_categories').doc(categoryId);
        const doc = await favRef.get();

        if (doc.exists) {
            await favRef.delete();
            return { success: true, action: 'removed', message: 'Category removed from favorites.' };
        } else {
            await favRef.set({
                id: categoryId,
                name: categoryName,
                href: categoryHref,
                savedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return { success: true, action: 'added', message: 'Category added to favorites.' };
        }
    } catch (error: any) {
        console.error('Error toggling favorite category:', error);
        return { success: false, message: error.message || 'Failed to update favorites.' };
    }
}
