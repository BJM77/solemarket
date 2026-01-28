
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Read from .env.local and handle escaping manually
const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_JSON="(.+)"/);

if (match) {
    let jsonStr = match[1];
    // Unescape the string
    jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

    try {
        const serviceAccount = JSON.parse(jsonStr);
        if (serviceAccount.private_key) {
            serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        initializeApp({
            credential: cert(serviceAccount)
        });
        console.log('✅ Initialized with manual parse');
    } catch (e) {
        console.error('❌ Failed manual parse:', e.message);
        process.exit(1);
    }
} else {
    console.error('❌ Could not find FIREBASE_SERVICE_ACCOUNT_JSON in .env.local');
    process.exit(1);
}

const db = getFirestore();

async function testQuery() {
    const testCases = [
        {
            name: 'Category + isDraft + createdAt',
            q: db.collection('products')
                .where('isDraft', '==', false)
                .where('category', '==', 'Coins')
                .orderBy('createdAt', 'desc')
                .limit(1)
        }
    ];

    for (const t of testCases) {
        console.log(`\nRunning query: ${t.name}`);
        try {
            await t.q.get();
            console.log(`✅ Success!`);
        } catch (error) {
            console.error(`❌ Failed:`, error.message);
        }
    }
}

testQuery();
