
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

async function inspect() {
  console.log('--- FIRESTORE INSPECTION (WITH SERVICE ACCOUNT) ---');
  
  const productsRef = db.collection('products');
  
  // 1. Get all documents to see what's there
  const allDocs = await productsRef.limit(100).get();
  console.log(`Total documents sampled: ${allDocs.size}`);
  
  allDocs.docs.forEach(doc => {
    const data = doc.data();
    const title = data.title || 'No Title';
    const cat = data.category || 'No Category';
    const subCat = data.subCategory || 'No SubCategory';
    const brand = data.brand || 'No Brand';
    const keywords = data.keywords || [];
    
    // Check if it's a Jordan product
    const isJordan = title.toLowerCase().includes('jordan') || 
                     (typeof subCat === 'string' && subCat.toLowerCase().includes('jordan')) || 
                     (typeof brand === 'string' && brand.toLowerCase().includes('jordan'));
    
    if (isJordan) {
      console.log(`[MATCH] ID: ${doc.id}`);
      console.log(`  Title: ${title}`);
      console.log(`  Category: ${cat}`);
      console.log(`  SubCategory: ${subCat}`);
      console.log(`  Brand: ${brand}`);
      console.log(`  Keywords: [${keywords.join(', ')}]`);
      console.log(`  Status: ${data.status}`);
      console.log('---');
    }
  });

  // 2. Try the exact query used in the app
  console.log('Testing specific filters...');
  const jordanSub = await productsRef.where('subCategory', '==', 'Jordan').get();
  console.log(`subCategory == 'Jordan' count: ${jordanSub.size}`);
  
  const jordanBrand = await productsRef.where('brand', '==', 'Jordan').get();
  console.log(`brand == 'Jordan' count: ${jordanBrand.size}`);
}

inspect().catch(console.error);
