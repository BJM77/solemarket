
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Use the explicit file the user mentioned
const saPath = path.resolve(process.cwd(), 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function testCombinations() {
    const p = db.collection('products');
    const queries = [
        {
            name: 'Cat + isDraft + PriceRange + Sort Price',
            q: p.where('category', '==', 'Coins')
                .where('isDraft', '==', false)
                .where('price', '>=', 10)
                .orderBy('price', 'asc')
        },
        {
            name: 'Cat + isDraft + PriceRange + Sort Newest (Custom Sort)',
            q: p.where('category', '==', 'Coins')
                .where('isDraft', '==', false)
                .where('price', '>=', 10)
                .orderBy('price', 'asc')
                .orderBy('createdAt', 'desc')
        },
        {
            name: 'SubCat + isDraft + PriceRange + Sort Newest',
            q: p.where('subCategory', '==', 'Coins')
                .where('isDraft', '==', false)
                .where('price', '>=', 10)
                .orderBy('price', 'asc')
                .orderBy('createdAt', 'desc')
        },
        {
            name: 'Condition(in) + isDraft + createdAt (Marketplace Browse)',
            q: p.where('condition', 'in', ['Near Mint', 'Mint'])
                .where('isDraft', '==', false)
                .orderBy('createdAt', 'desc')
        }
    ];

    console.log('--- DEEP FIREBASE QUERY TEST ---');
    for (const t of queries) {
        console.log(`\nTesting: ${t.name}`);
        try {
            await t.q.limit(1).get();
            console.log(`✅ OK`);
        } catch (e) {
            console.log(`❌ Error: ${e.message}`);
            if (e.message.includes('create it here:')) {
                console.log(`URL: ${e.message.split('it here: ')[1]}`);
            }
        }
    }
}

testCombinations();
