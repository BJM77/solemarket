
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!admin.apps.length) {
    const fs = require('fs');
    const saFile = path.resolve(process.cwd(), 'service-account.json');
    const config = {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    };
    
    if (fs.existsSync(saFile)) {
        const serviceAccount = JSON.parse(fs.readFileSync(saFile, 'utf8'));
        admin.initializeApp({
            ...config,
            credential: admin.credential.cert(serviceAccount),
        });
        console.log('✅ Initialized with service-account.json');
    } else {
        admin.initializeApp(config);
        console.log('⚠️ Initialized without explicit credentials (falling back to ADC)');
    }
}

const db = admin.firestore();

async function fixProducts() {
    console.log('--- STARTING PRODUCT DATA REPAIR ---');
    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    let fixedCount = 0;
    const now = admin.firestore.Timestamp.now();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        let needsFix = false;
        const updates = {};

        // 1. Fix Status (empty, pending, or draft that should be live)
        // If it has a title and price, we assume it should be available for this "fix all" request
        if (!data.status || data.status === 'pending_approval' || data.status === '') {
            if (data.title || data.price) {
                updates.status = 'available';
                updates.isDraft = false;
                needsFix = true;
            }
        }

        // 2. Fix Release Timing
        if (data.publicReleaseAt) {
            if (data.publicReleaseAt.seconds > now.seconds) {
                updates.publicReleaseAt = now;
                needsFix = true;
            }
        } else if (updates.status === 'available' || data.status === 'available') {
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
            console.log(`Fixing product: ${doc.id} | Status: ${data.status || 'EMPTY'} -> ${updates.status || data.status} | Title: ${data.title || 'Untitled'}`);
            await doc.ref.update(updates);
            fixedCount++;
        }
    }

    console.log(`--- REPAIR COMPLETE: ${fixedCount} products updated ---`);
}

fixProducts().catch(console.error);
