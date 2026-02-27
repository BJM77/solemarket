
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

let serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.SERVICE_ACCOUNT_JSON;

if (serviceAccountJson) {
    try {
        // Handle double-encoded JSON or escaped strings
        let serviceAccount = JSON.parse(serviceAccountJson);
        if (typeof serviceAccount === 'string') {
            serviceAccount = JSON.parse(serviceAccount);
        }

        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }

        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log('✅ Initialized with service account');
    } catch (e) {
        console.error('❌ Failed to parse service account JSON:', e.message);
        process.exit(1);
    }
} else {
    initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-3973035687-658c0'
    });
    console.log('⚠️ Initialized with default project ID');
}

const db = getFirestore();

async function testQuery() {
    console.log('Testing Firestore Queries...');

    const testCases = [
        {
            name: 'Category [Coins] + isDraft [false] + createdAt [DESC]',
            q: db.collection('products')
                .where('isDraft', '==', false)
                .where('category', '==', 'Coins')
                .orderBy('createdAt', 'desc')
                .limit(1)
        },
        {
            name: 'Category [General] + isDraft [false] + createdAt [DESC]',
            q: db.collection('products')
                .where('isDraft', '==', false)
                .where('category', '==', 'General')
                .orderBy('createdAt', 'desc')
                .limit(1)
        }
    ];

    for (const t of testCases) {
        console.log(`\nRunning query: ${t.name}`);
        try {
            const snapshot = await t.q.get();
            console.log(`✅ Success! Found ${snapshot.size} docs.`);
        } catch (error) {
            console.error(`❌ Failed:`, error.message);
            if (error.message.includes('requires an index')) {
                const link = error.message.split('You can create it here: ')[1];
                if (link) {
                    console.log('\n--- INDEX LINK ---');
                    console.log(link.split(' ')[0]); // Get just the URL
                    console.log('------------------\n');
                }
            }
        }
    }
}

testQuery();
