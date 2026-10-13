
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

function generateKeywords(title) {
  if (!title) return [];
  const words = title.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  return [...new Set(words)]; // Unique words
}

async function backfill() {
  console.log('--- STARTING KEYWORD BACKFILL ---');
  const productsRef = db.collection('products');
  const snapshot = await productsRef.get();
  
  console.log(`Found ${snapshot.size} products to process.`);
  
  let updatedCount = 0;
  const batch = db.batch();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentKeywords = data.keywords || [];
    
    // Generate new keywords from title
    const newKeywords = generateKeywords(data.title);
    
    // If they are different or missing, update
    if (JSON.stringify(currentKeywords.sort()) !== JSON.stringify(newKeywords.sort())) {
      batch.update(doc.ref, { keywords: newKeywords });
      updatedCount++;
      
      if (updatedCount % 50 === 0) {
        console.log(`Prepared ${updatedCount} updates...`);
      }
    }
  }
  
  if (updatedCount > 0) {
    await batch.commit();
    console.log(`Successfully updated ${updatedCount} products with keywords.`);
  } else {
    console.log('No updates needed.');
  }
}

backfill().catch(console.error);
