
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

async function testQuery() {
  const productsRef = db.collection('products');
  
  const FilterConstraints = [
    admin.firestore.Filter.where('status', '==', 'available'),
    admin.firestore.Filter.where('category', 'in', ['Sneakers', 'Shoes', 'shoes', 'sneakers']),
    admin.firestore.Filter.or(
      admin.firestore.Filter.where('subCategory', '==', 'Jordan'),
      admin.firestore.Filter.where('brand', '==', 'Jordan'),
      admin.firestore.Filter.where('keywords', 'array-contains', 'jordan')
    )
  ];

  const complexQuery = productsRef
    .where(admin.firestore.Filter.and(...FilterConstraints))
    .orderBy('createdAt', 'desc')
    .limit(24);

  try {
    const snapshot = await complexQuery.get();
    console.log(`Query succeeded! Found ${snapshot.size} results.`);
    snapshot.forEach(doc => {
      console.log(`- ${doc.data().title}`);
    });
  } catch (error) {
    console.error('Query Failed!');
    console.error(error.message);
  }
}

testQuery().catch(console.error);
