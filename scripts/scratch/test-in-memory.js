
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

async function testQueryInMemory() {
  const productsRef = db.collection('products');
  
  // Get all available sneakers
  const snapshot = await productsRef
    .where('status', '==', 'available')
    .where('category', 'in', ['Sneakers', 'Shoes', 'shoes', 'sneakers'])
    .get();

  console.log(`Found ${snapshot.size} available sneakers in total.`);
  
  let matches = 0;
  snapshot.forEach(doc => {
    const data = doc.data();
    const title = data.title || '';
    const subCat = data.subCategory || '';
    const brand = data.brand || '';
    const keywords = data.keywords || [];

    // This is the EXACT logic our 'or()' statement is doing in product-service.ts
    if (subCat === 'Jordan' || brand === 'Jordan' || keywords.includes('jordan')) {
      console.log(`[MATCH] - ${title}`);
      console.log(`   (SubCat: ${subCat}, Brand: ${brand}, Keywords: [${keywords.join(',')}])`);
      matches++;
    }
  });

  console.log(`\nTotal matched by the "Jordan" filter logic: ${matches}`);
  console.log('Once the Firestore indexes finish building in the Google Cloud Console, these are the exact results that will appear on the website!');
}

testQueryInMemory().catch(console.error);
