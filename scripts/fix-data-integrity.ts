
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('Starting data integrity backfill...');

    let app;

    // Try to find service account file
    const files = fs.readdirSync(process.cwd());
    const saFile = files.find((f: string) => f.startsWith('studio-') && f.endsWith('.json'));

    if (saFile) {
        console.log(`Found service account file: ${saFile}`);
        const saPath = path.resolve(process.cwd(), saFile);
        app = admin.initializeApp({
            credential: admin.credential.cert(require(saPath))
        });
    } else {
        console.log('No service account file found, trying ADC...');
        app = admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }

    const db = app.firestore();
    const productsRef = db.collection('products');
    const batchSize = 400;
    let updatedCount = 0;
    let batch = db.batch();
    let opCount = 0;

    try {
        // 1. Get Verified Sellers Map
        const usersSnap = await db.collection('users').where('isVerified', '==', true).get();
        const verifiedSellerIds = new Set(usersSnap.docs.map((doc: any) => doc.id));
        console.log(`Found ${verifiedSellerIds.size} verified sellers.`);

        // 2. Iterate ALL products
        const productsSnap = await productsRef.get();
        console.log(`Found ${productsSnap.size} total products to check.`);

        if (productsSnap.empty) {
            console.log('No products found.');
            return;
        }

        for (const doc of productsSnap.docs) {
            const data = doc.data();
            let needsUpdate = false;
            let updateData: any = {};

            // Check isFeatured
            if (data.isFeatured === undefined) {
                updateData.isFeatured = false;
                needsUpdate = true;
            }

            // Check sellerVerified
            const shouldBeVerified = verifiedSellerIds.has(data.sellerId);
            if (data.sellerVerified !== shouldBeVerified) {
                updateData.sellerVerified = shouldBeVerified;
                needsUpdate = true;
            }

            if (needsUpdate) {
                batch.update(doc.ref, updateData);
                opCount++;
                updatedCount++;

                if (opCount >= batchSize) {
                    await batch.commit();
                    batch = db.batch();
                    opCount = 0;
                    process.stdout.write('.');
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        console.log(`\nSuccessfully updated ${updatedCount} products.`);

    } catch (error) {
        console.error('Error backfilling:', error);
    }
}

main();
