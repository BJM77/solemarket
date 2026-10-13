
const admin = require('firebase-admin');
const saPath = './service-account.json';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require(saPath))
    });
}

const db = admin.firestore();

async function migrate() {
    console.log('Starting migration...');
    const snapshot = await db.collection('products').get();
    let count = 0;

    const batch = db.batch();

    for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data.userId && !data.sellerId) {
            batch.update(doc.ref, { sellerId: data.userId });
            count++;
        }
    }

    if (count > 0) {
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
