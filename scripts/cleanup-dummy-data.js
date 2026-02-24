const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(require('/Users/bjm/Desktop/Sneak/service-account.json')),
        projectId: 'studio-3973035687-658c0'
    });
}

const db = admin.firestore();

async function cleanupTestData() {
    console.log('Starting dummy data cleanup...');
    let deletedCount = 0;

    try {
        // 1. Clean up WTB (Wanted To Buy) Listings with dummy titles or massive prices
        const wtbSnapshot = await db.collection('wanted_listings').get();
        for (const doc of wtbSnapshot.docs) {
            const data = doc.data();
            const title = data.title ? data.title.toLowerCase() : '';
            if (title.includes('test') || title.includes('dummy') || data.maxPrice > 1000000) {
                console.log(`Deleting Dummy WTB: ${data.title}`);
                await doc.ref.delete();
                deletedCount++;
            }
        }

        // 2. Clean up dummy products (we only delete obvious ones to avoid touching live user data)
        const productsSnapshot = await db.collection('products').get();
        for (const doc of productsSnapshot.docs) {
            const data = doc.data();
            const title = data.title ? data.title.toLowerCase() : '';
            if (title.includes('test product') || title.includes('dummy')) {
                console.log(`Deleting Dummy Product: ${data.title}`);
                await doc.ref.delete();
                deletedCount++;
            }
        }

        console.log(`\nCleanup complete! Deleted ${deletedCount} document(s).`);
    } catch (e) {
        console.error('Error during cleanup:', e);
    }
}

cleanupTestData();
