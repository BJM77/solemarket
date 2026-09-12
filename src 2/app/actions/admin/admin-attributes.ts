'use server';

import { firestoreDb, admin } from '@/lib/firebase/admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

/**
 * Server Actions for managing marketplace attributes (conditions, manufacturers, brands)
 * with admin role verification.
 */

export async function addAttributeValue(
    attributeKey: 'conditions' | 'manufacturers' | 'brands',
    value: string,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        if (!value || value.trim().length === 0) {
            throw new Error('Value cannot be empty');
        }

        await firestoreDb.collection('settings').doc('marketplace_options').update({
            [attributeKey]: admin.firestore.FieldValue.arrayUnion(value.trim())
        });

        return { success: true };
    } catch (error: any) {
        console.error('[addAttributeValue] Error:', error);
        throw new Error(error.message || 'Failed to add attribute value');
    }
}

export async function removeAttributeValue(
    attributeKey: 'conditions' | 'manufacturers' | 'brands',
    value: string,
    idToken: string
) {
    try {
        const decodedToken = await verifyIdToken(idToken);
        const role = decodedToken.role as string | undefined;

        if (role !== 'superadmin' && role !== 'admin') {
            throw new Error('Unauthorized: Admin privileges required');
        }

        await firestoreDb.collection('settings').doc('marketplace_options').update({
            [attributeKey]: admin.firestore.FieldValue.arrayRemove(value)
        });

        return { success: true };
    } catch (error: any) {
        console.error('[removeAttributeValue] Error:', error);
        throw new Error(error.message || 'Failed to remove attribute value');
    }
}
