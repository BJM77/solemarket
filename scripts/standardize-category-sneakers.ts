import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'bidsy-au' // Assuming this or it will pick up from env GOOGLE_APPLICATION_CREDENTIALS
    });
}

const db = admin.firestore();

async function runMigration() {
    console.log('Starting category standardization migration...');

    try {
        const productsRef = db.collection('products');
        
        // Find products with category "Shoes"
        const shoesQuery = await productsRef.where('category', '==', 'Shoes').get();
        console.log(`Found ${shoesQuery.size} products with category "Shoes"`);

        if (shoesQuery.size === 0) {
            console.log('No migration needed.');
            return;
        }

        const batch = db.batch();
        let count = 0;

        shoesQuery.forEach((doc) => {
            batch.update(doc.ref, { category: 'Sneakers' });
            count++;
        });

        if (count > 0) {
            await batch.commit();
            console.log(`Successfully updated ${count} products to category "Sneakers"`);
        }

    } catch (error) {
        console.error('Error running migration:', error);
    }
}

runMigration().then(() => process.exit(0)).catch(() => process.exit(1));
