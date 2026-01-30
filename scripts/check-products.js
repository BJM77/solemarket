require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

// Initialize Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function checkProducts() {
  try {
    console.log('Fetching all products from Firestore...\n');

    const snapshot = await db.collection('products').limit(50).get();

    console.log(`Total products found: ${snapshot.size}\n`);

    if (snapshot.empty) {
      console.log('❌ No products found in the database!');
      return;
    }

    console.log('Product Details:');
    console.log('================\n');

    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. Product ID: ${doc.id}`);
      console.log(`   Title: ${data.title || 'N/A'}`);
      console.log(`   Status: ${data.status || 'MISSING'}`);
      console.log(`   isDraft: ${data.isDraft !== undefined ? data.isDraft : 'MISSING'}`);
      console.log(`   Price: ${data.price !== undefined ? data.price : 'MISSING'}`);
      console.log(`   Category: ${data.category || 'N/A'}`);
      console.log(`   CreatedAt: ${data.createdAt ? 'Present' : 'MISSING'}`);
      console.log(`   Seller ID: ${data.sellerId || 'N/A'}`);
      console.log('');
    });

    // Count by status
    const statusCounts = {};
    const draftCounts = { draft: 0, notDraft: 0, missing: 0 };

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'NO_STATUS';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      if (data.isDraft === true) draftCounts.draft++;
      else if (data.isDraft === false) draftCounts.notDraft++;
      else draftCounts.missing++;
    });

    console.log('\nStatus Breakdown:');
    console.log('=================');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`${status}: ${count}`);
    });

    console.log('\nisDraft Breakdown:');
    console.log('==================');
    console.log(`isDraft=true: ${draftCounts.draft}`);
    console.log(`isDraft=false: ${draftCounts.notDraft}`);
    console.log(`isDraft missing: ${draftCounts.missing}`);

  } catch (error) {
    console.error('❌ Error checking products:', error);
  } finally {
    process.exit(0);
  }
}

checkProducts();
