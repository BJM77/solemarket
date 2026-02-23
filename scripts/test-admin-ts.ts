
import { firestoreDb } from '@/lib/firebase/admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  console.log('Testing admin.ts initialization...');
  try {
    if (!firestoreDb) {
      console.error('❌ firestoreDb is undefined!');
      return;
    }
    const id = '25xu5KZh1mQs8TdEbOgs';
    console.log(`Fetching product ${id} using admin.ts instance...`);
    const docSnap = await firestoreDb.collection('products').doc(id).get();
    
    if (docSnap.exists) {
      console.log('✅ Product found:', docSnap.data().title);
    } else {
      console.log('❌ Product not found (returned null)');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

run();
