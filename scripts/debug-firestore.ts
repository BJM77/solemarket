// Run with: npx ts-node scripts/debug-firestore.ts
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

if (getApps().length === 0) {
    try {
        const serviceAccountPath = path.join(__dirname, '..', 'service-account-key.json');
        if (fs.existsSync(serviceAccountPath)) {
            const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            initializeApp({
                credential: cert(serviceAccount)
            });
            console.log("Initialized with service account.");
        } else {
            console.warn("Service account key not found, attempting default creds...");
            initializeApp();
        }
    } catch (e) {
        console.error("Initialization error:", e);
        process.exit(1);
    }
}

const db = getFirestore();

async function listCollections() {
    console.log("Listing collections...");
    try {
        const collections = await db.listCollections();
        if (collections.length === 0) {
            console.log("No collections found.");
        } else {
            console.log("Collections found:");
            collections.forEach(col => console.log(` - ${col.id}`));
        }
    } catch (error) {
        console.error("Error listing collections:", error);
    }
}

listCollections();
