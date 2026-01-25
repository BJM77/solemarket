
import * as fs from 'fs';
import * as path from 'path';

// Manually read .env.local to ensure variables are set before any imports
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const jsonLine = envContent.split('\n').find(line => line.startsWith('FIREBASE_SERVICE_ACCOUNT_JSON='));

if (jsonLine) {
    const jsonVal = jsonLine.split('=', 2)[1]; // Split by first =
    // Handle simplified parsing (might still be raw string or quoted)
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = jsonVal;
    console.log('✅ Manually loaded FIREBASE_SERVICE_ACCOUNT_JSON');
} else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
}

async function deleteProducts() {
    // Dynamic import to ensure env vars are set first
    const { firestoreDb } = await import('../src/lib/firebase/admin');

    const productIds = ['prod_456', 'EAwQGIZgXqxVCuvrPckP'];
    console.log(`🗑️ Deleting ${productIds.length} test products...`);

    for (const id of productIds) {
        try {
            await firestoreDb.collection('products').doc(id).delete();
            console.log(`✅ Deleted product: ${id}`);
        } catch (error: any) {
            console.error(`❌ Failed to delete ${id}:`, error.message);
        }
    }
    console.log('✨ Cleanup complete.');
    process.exit(0);
}

deleteProducts();
