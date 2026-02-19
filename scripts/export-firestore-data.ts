// Run with: npx ts-node scripts/export-firestore-data.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Firebase Admin (if not already initialized)
if (getApps().length === 0) {
    // Check for service account key or default credentials
    try {
        const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("Initialized with service account.");
        } else {
            console.warn("Service account key not found at " + serviceAccountPath + ", attempting default application credentials...");
            initializeApp();
        }
    } catch (e) {
        console.error("Initialization error:", e);
        process.exit(1);
    }
}

const db = getFirestore();

async function exportCollection(collectionName: string, outputFile: string) {
    console.log(`Exporting ${collectionName}...`);
    try {
        const snapshot = await db.collection(collectionName).get();
        if (snapshot.empty) {
            console.warn(`⚠️ Collection '${collectionName}' is empty or does not exist.`);
            return [];
        }

        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const filePath = path.join(__dirname, '..', 'data', outputFile);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ ${data.length} documents exported to ${filePath}`);
        return data;
    } catch (error) {
        console.error(`❌ Failed to export ${collectionName}:`, error);
        return [];
    }
}

async function main() {
    // Ensure data directory exists
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    // Export Products
    await exportCollection('products', 'products.json');

    // Export Orders (Optional - usually PII sensitive)
    // Uncomment if you want to export orders for analysis
    // await exportCollection('orders', 'orders.json');
    
    console.log('Export complete.');
}

main().catch(console.error);
