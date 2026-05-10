const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  const querySnapshot = await getDocs(collection(db, 'products'));
  const docs = [];
  querySnapshot.forEach(doc => {
    const data = doc.data();
    docs.push({ id: doc.id, title: data.title, category: data.category, status: data.status, isDraft: data.isDraft });
  });
  console.log(JSON.stringify(docs, null, 2));
}

main().catch(console.error);
