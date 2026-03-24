
const admin = require('firebase-admin');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'service-account.json');
const serviceAccount = require(serviceAccountPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

const db = admin.firestore();

async function checkLebron() {
  const docRef = db.collection('products').doc('s4PBdJTdQKxogInTa19Z');
  const doc = await docRef.get();
  if (doc.exists) {
    const data = doc.data();
    console.log('Title:', data.title);
    console.log('Image URLs:', JSON.stringify(data.imageUrls, null, 2));
    if (data.imageUrls && data.imageUrls.length > 0) {
      console.log('Primary URL matches string?', typeof data.imageUrls[0] === 'string');
    }
  } else {
    console.log('Doc not found');
  }
}

checkLebron().catch(console.error);
