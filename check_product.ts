import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (getApps().length === 0) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  });
}

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('products').orderBy('createdAt', 'desc').limit(1).get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().imageUrls);
  });
}
run();
