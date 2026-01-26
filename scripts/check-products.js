
const admin = require('firebase-admin');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin (using ADC or service account if available)
if (process.env.SERVICE_ACCOUNT_JSON) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  initializeApp({
      projectId: 'studio-8322868971-8ca89'
  });
}

const db = getFirestore();

async function checkProducts() {
  console.log('Searching for "Fix Test" and "Charizard"...');

  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();

  if (snapshot.empty) {
    console.log('No products found in collection.');
    return;
  }

  let found = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const title = data.title || '';
    if (title.includes('Fix Test') || title.includes('Charizard')) {
      console.log(`\nFOUND PRODUCT: ${doc.id}`);
      console.log(`Title: ${data.title}`);
      console.log(`Status: ${data.status}`); // Check if there is a status field
      console.log(`isDraft: ${data.isDraft}`);
      console.log(`SellerID: ${data.sellerId}`);
      found++;
    }
  });

  if (found === 0) {
      console.log('None of the suspect products were found in the DB.');
  }
}

checkProducts().catch(console.error);
