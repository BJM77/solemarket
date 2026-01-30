'use server';

import { firestoreDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';
import { verifyIdToken } from '@/lib/firebase/auth-admin';

export async function migrateProductStatus(idToken: string) {
    if (!idToken) return { success: false, error: 'Unauthorized' };

    try {
        const decoded = await verifyIdToken(idToken);
        if (decoded.role !== 'superadmin') return { success: false, error: 'Forbidden' };

        const batch = firestoreDb.batch();
        const productsRef = firestoreDb.collection('products');

        // Find products missing 'status' field
        // Note: Firestore doesn't easily query for "missing field", so we might have to fetch all and filter in memory if the dataset is small enough, 
        // OR rely on the fact that old products likely don't have it.
        // A better approach for a migration script is usually to fetch all that MIGHT be affected.
        // Let's fetch all products, it shouldn't be massive yet.

        const snapshot = await productsRef.get();
        let updatedCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const updates: any = {};
            let needsUpdate = false;

            if (!data.status) {
                updates.status = 'available';
                needsUpdate = true;
            }

            if (data.isDraft === undefined) {
                updates.isDraft = false;
                needsUpdate = true;
            }

            if (data.price === undefined) {
                updates.price = 0;
                needsUpdate = true;
            }

            if (!data.createdAt) {
                updates.createdAt = admin.firestore.FieldValue.serverTimestamp();
                needsUpdate = true;
            }

            if (needsUpdate) {
                updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
                batch.update(doc.ref, updates);
                updatedCount++;
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
        }

        return { success: true, count: updatedCount, message: `Updated ${updatedCount} products to 'available' status.` };
    } catch (error: any) {
        console.error("Migration failed:", error);
        return { success: false, error: error.message };
    }
}
