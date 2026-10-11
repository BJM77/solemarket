
require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
    try {
        if (serviceAccountJson) {
            let serviceAccount = JSON.parse(serviceAccountJson);
            if (typeof serviceAccount === 'string') serviceAccount = JSON.parse(serviceAccount);
            if (serviceAccount.private_key) serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: serviceAccount.project_id || 'studio-8322868971-8ca89'
            });
        } else {
            admin.initializeApp({ projectId: 'studio-8322868971-8ca89' });
        }
    } catch (e) {
        console.error('Error initializing:', e);
    }
}

const db = admin.firestore();

async function listAll() {
    try {
        console.log('Listing Collections...');
        const collections = await db.listCollections();
        console.log('Collectionsfound:', collections.map(c => c.id));

        for (const col of collections) {
            console.log(`\n--- Collection: ${col.id} ---`);
            const snapshot = await col.limit(5).get();
            if (snapshot.empty) {
                console.log('  (empty)');
            } else {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`  Doc ID: ${doc.id}`);
                    if (col.id === 'products') {
                        console.log(`    Title: ${data.title}`);
                        console.log(`    Price: ${data.price}`);
                        console.log(`    Seller: ${data.sellerId}`);
                        console.log(`    isDraft: ${data.isDraft}`);
                    }
                });
            }
        }
    } catch (error) {
        console.error('Error listing DB:', error);
    }
}

listAll();
