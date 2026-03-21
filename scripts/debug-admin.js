require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (serviceAccountJson) {
  const serviceAccount = JSON.parse(serviceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
} else {
    // Attempt parsing private key directly
    try {
        const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n');
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
    } catch(e) {
        console.error("Failed Admin init", e);
        process.exit(1);
    }
}

const db = admin.firestore();

async function run() {
  const jordans = await db.collection('products')
    .where('subCategory', '==', 'Jordan')
    .get();
  
  console.log(`Found ${jordans.size} products with subCategory=Jordan`);
  jordans.docs.forEach(d => {
    const data = d.data();
    console.log(`- ${d.id}: status=${data.status}, brand=${data.brand}, subCategory=${data.subCategory}`);
  });
}

run().catch(console.error).finally(() => process.exit(0));
