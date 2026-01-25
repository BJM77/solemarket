// Quick script to delete test products
const admin = require('firebase-admin');

// Initialize with ADC (Application Default Credentials)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'studio-8322868971-8ca89',
    });
}

const db = admin.firestore();

async function deleteProducts() {
    const productIds = [
        'prod_456',
        'EAwQGIZgXqxVCuvrPckP'
    ];

    console.log('Deleting products...');

    for (const id of productIds) {
        try {
            await db.collection('products').doc(id).delete();
            console.log(`✅ Deleted product: ${id}`);
        } catch (error) {
            console.error(`❌ Failed to delete ${id}:`, error.message);
        }
    }

    console.log('\nDone!');
    process.exit(0);
}

deleteProducts();
