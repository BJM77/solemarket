
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const envContent = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_JSON="(.+)"/);

if (match) {
    let jsonStr = match[1];
    jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    const serviceAccount = JSON.parse(jsonStr);
    if (serviceAccount.private_key) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();

async function testAllQueries() {
    const p = db.collection('products');
    const queries = [
        { name: 'Cat + isDraft + createdAt', q: p.where('isDraft', '==', false).where('category', '==', 'Coins').orderBy('createdAt', 'desc') },
        { name: 'SubCat + isDraft + createdAt', q: p.where('isDraft', '==', false).where('subCategory', '==', 'Coins').orderBy('createdAt', 'desc') },
        { name: 'Cat + SubCat + isDraft + createdAt', q: p.where('isDraft', '==', false).where('category', '==', 'Collector Cards').where('subCategory', '==', 'Sports Cards').orderBy('createdAt', 'desc') },
        { name: 'Conditions (in) + isDraft + createdAt', q: p.where('isDraft', '==', false).where('condition', 'in', ['Mint']).orderBy('createdAt', 'desc') },
        { name: 'Price Range + isDraft + price (ASC)', q: p.where('isDraft', '==', false).where('price', '>=', 10).where('price', '<=', 100).orderBy('price', 'asc') }
    ];

    for (const t of queries) {
        console.log(`\nTesting: ${t.name}`);
        try {
            await t.q.limit(1).get();
            console.log(`✅ OK`);
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
        }
    }
}

testAllQueries();
