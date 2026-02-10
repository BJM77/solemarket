'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

/**
 * Server Actions for managing categories with admin role verification.
 */

interface CategoryInput {
    name: string;
    section: string;
    href: string;
    showOnHomepage?: boolean;
    showInNav?: boolean;
    isPopular?: boolean;
    order?: number;
}

export async function createCategory(
    categoryData: CategoryInput,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        // Validate input
        if (!categoryData.name || !categoryData.section || !categoryData.href) {
            throw new Error('All fields are required');
        }

        const docRef = await firestoreDb.collection('categories').add({
            name: categoryData.name,
            section: categoryData.section,
            href: categoryData.href,
            showOnHomepage: categoryData.showOnHomepage ?? false,
            showInNav: categoryData.showInNav ?? true,
            isPopular: categoryData.isPopular ?? false,
            order: categoryData.order ?? 0,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, id: docRef.id };
    } catch (error: any) {
        console.error('[createCategory] Error:', error);
        throw new Error(error.message || 'Failed to create category');
    }
}

export async function updateCategory(
    categoryId: string,
    categoryData: CategoryInput,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        // Validate input
        if (!categoryData.name || !categoryData.section || !categoryData.href) {
            throw new Error('All fields are required');
        }

        await firestoreDb.collection('categories').doc(categoryId).update({
            name: categoryData.name,
            section: categoryData.section,
            href: categoryData.href,
            showOnHomepage: categoryData.showOnHomepage ?? false,
            showInNav: categoryData.showInNav ?? true, // Default to true if not specified
            isPopular: categoryData.isPopular ?? false,
            order: categoryData.order ?? 0
        });

        return { success: true };
    } catch (error: any) {
        console.error('[updateCategory] Error:', error);
        throw new Error(error.message || 'Failed to update category');
    }
}

export async function deleteCategory(
    categoryId: string,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        await firestoreDb.collection('categories').doc(categoryId).delete();

        return { success: true };
    } catch (error: any) {
        console.error('[deleteCategory] Error:', error);
        throw new Error(error.message || 'Failed to delete category');
    }
}
