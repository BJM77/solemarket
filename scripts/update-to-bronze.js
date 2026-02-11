
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');
const fs = require('fs');

// Load service account from environment or file
const serviceAccountPath = '/Users/bjm/Desktop/Pick1901/service-account.json';
let serviceAccount;

if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
} else {
    // Fallback to searching for it if not in the expected place
    // Or assume it's set in environment variables which we don't have direct access to here in a plain script
    console.error('Service account not found at ' + serviceAccountPath);
    process.exit(1);
}

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

async function updateToBronze() {
    const productsRef = db.collection('products');
    const snapshot = await productsRef
        .where('status', '==', 'available')
        .get();

    let count = 0;
    const batch = db.batch();

    snapshot.forEach(doc => {
        const data = doc.data();
        const price = Number(data.price);

        if (data.imageUrls && data.imageUrls.length > 0 && price < 5 && price > 0) {
            console.log(`Updating ${doc.id}: ${data.title} ($${price})`);
            batch.update(doc.ref, {
                multiCardTier: 'bronze',
                multibuyEnabled: true,
                updatedAt: new Date()
            });
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
        console.log(`Successfully updated ${count} products to Bronze tier.`);
    } else {
        console.log('No products found matching criteria.');
    }
}

updateToBronze().catch(console.error);
