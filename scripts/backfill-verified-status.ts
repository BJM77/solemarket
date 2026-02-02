
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Starting standalone backfill...');

    let app;

    // Try to find service account file
    const files = fs.readdirSync(process.cwd());
    const saFile = files.find(f => f.startsWith('studio-') && f.endsWith('.json'));

    if (saFile) {
        console.log(`Found service account file: ${saFile}`);
        const saPath = path.resolve(process.cwd(), saFile);
        app = admin.initializeApp({
            credential: admin.credential.cert(require(saPath))
        });
    } else {
        // Fallback to ADC
        console.log('No service account file found, trying ADC...');
        app = admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }

    const db = app.firestore();

    try {
        // 1. Get all verified sellers
        const usersSnap = await db.collection('users').where('isVerified', '==', true).get();

        if (usersSnap.empty) {
            console.log('No verified users found.');
            return;
        }

        const verifiedUserIds = usersSnap.docs.map(doc => doc.id);
        console.log(`Found ${verifiedUserIds.length} verified sellers:`, verifiedUserIds);

        // 2. Update their products
        const productsRef = db.collection('products');
        let updatedCount = 0;
        const batchSize = 450;
        let batch = db.batch();
        let opCount = 0;

        // Chunk verifiedUserIds into groups of 10 for 'in' query
        const chunks = [];
        for (let i = 0; i < verifiedUserIds.length; i += 10) {
            chunks.push(verifiedUserIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
            const productsSnap = await productsRef.where('sellerId', 'in', chunk).get();

            for (const doc of productsSnap.docs) {
                batch.update(doc.ref, { sellerVerified: true });
                opCount++;
                updatedCount++;

                if (opCount >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log(`Successfully updated ${updatedCount} products.`);

    } catch (error) {
        console.error('Error backfilling:', error);
    }
}

main();
