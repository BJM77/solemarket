
import * as admin from 'firebase-admin';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!getApps().length) {
    initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
}

const db = getFirestore();

async function fixProducts() {
    console.log('--- STARTING PRODUCT DATA REPAIR ---');
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    let fixedCount = 0;
    const now = admin.firestore.Timestamp.now();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsFix = false;
        const updates: any = {};

        // 1. Fix Status (empty or pending)
        if (!data.status || data.status === 'pending_approval' || data.status === '') {
            updates.status = 'available';
            updates.isDraft = false;
            needsFix = true;
        }

        // 2. Fix Release Timing
        if (data.publicReleaseAt) {
            // If it is in the future, set to now
            const releaseAt = data.publicReleaseAt;
            if (releaseAt.seconds > now.seconds) {
                updates.publicReleaseAt = now;
                needsFix = true;
            }
        } else if (updates.status === 'available') {
            updates.publicReleaseAt = now;
            needsFix = true;
        }

        // 3. Fix missing timestamps
        if (!data.createdAt) {
            updates.createdAt = now;
            needsFix = true;
        }
        if (!data.updatedAt) {
            updates.updatedAt = now;
            needsFix = true;
        }

        if (needsFix) {
            console.log(`Fixing product: ${doc.id} (${data.title || 'Untitled'})`);
            await doc.ref.update(updates);
            fixedCount++;
        }
    }

    console.log(`--- REPAIR COMPLETE: ${fixedCount} products updated ---`);
}

fixProducts().catch(console.error);
