
const admin = require('firebase-admin');
const fs = require('fs');
const saPath = '/Users/bjm/Desktop/Pick1901/service-account.json';

if (!admin.apps.length) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function migrate() {
    console.log('Starting migration...');
    const snapshot = await db.collection('products').get();
    let count = 0;

    // Process in batches
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.userId && !data.sellerId) {
            batch.update(doc.ref, { sellerId: data.userId });
            count++;
            batchCount++;

            if (batchCount === 450) { // Firestore batch limit is 500
                await batch.commit();
                batchCount = 0;
            }
        }
    }

    if (batchCount > 0) {
        await batch.commit();
    }

    console.log(`Success: Migrated ${count} products.`);
}

migrate()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
