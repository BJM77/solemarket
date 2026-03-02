const admin = require('firebase-admin');

// Initialize admin app using application default credentials, or just simple instantiation if local emulator
// Wait, the project is studio-8322868971-8ca89. We need credentials. 
// Let's use the local file at .env.local
require('dotenv').config({ path: '.env.local' });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT_JSON)),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

const db = admin.firestore();

async function main() {
  const querySnapshot = await db.collection('products').get();
  const docs = [];
  querySnapshot.forEach(doc => {
    const data = doc.data();
    docs.push({ id: doc.id, title: data.title, category: data.category, status: data.status, isDraft: data.isDraft });
  });
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error);
