import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

function initAdmin() {
    if (admin.apps.length > 0) return admin.apps[0]!;

    const saPath = path.resolve(process.cwd(), 'service-account.json');
    if (fs.existsSync(saPath)) {
        return admin.initializeApp({
            credential: admin.credential.cert(require(saPath))
        });
    }

    if (process.env.SERVICE_ACCOUNT_JSON) {
        return admin.initializeApp({
            credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_JSON))
        });
    }

    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
    const pk = process.env.FIREBASE_ADMIN_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (clientEmail && pk) {
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || projectId,
                clientEmail: clientEmail.trim(),
                privateKey: pk.replace(/\\n/g, '\n').trim(),
            })
        });
    }

    return admin.initializeApp({
        credential: admin.credential.applicationDefault()
    });
}

async function updateZeroPricedProducts() {
    console.log('Connecting to Firestore to scan for $0.00 products...');
    const app = initAdmin();
    const db = app.firestore();

    const productsRef = db.collection('products');
    const snapshot = await productsRef.get();

    console.log(`Found ${snapshot.size} total products in database.`);

    let matchingCount = 0;
    let batch = db.batch();
    let opCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();
        const price = Number(data.price);

        // Check if price is 0, 0.00, or missing/falsy
        if (price === 0 || isNaN(price) || data.price === '0' || data.price === '0.00' || data.price === 0.00) {
            matchingCount++;
            console.log(`[Updating] ID: ${doc.id} | Title: "${data.title}" | Old Price: $${data.price} -> New Price: $25.00`);
            
            batch.update(doc.ref, {
                price: 25.00,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            opCount++;

            if (opCount >= 400) {
                await batch.commit();
                console.log(`Committed batch of ${opCount} updates...`);
                batch = db.batch();
                opCount = 0;
            }
        }
    }

    if (opCount > 0) {
        await batch.commit();
        console.log(`Committed final batch of ${opCount} updates.`);
    }

    console.log(`\n🎉 Done! Updated ${matchingCount} product(s) from $0.00 to $25.00.`);
}

updateZeroPricedProducts().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
