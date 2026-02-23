
import { getProductById } from '@/lib/firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function run() {
  console.log('Running test-firestore-lib...');
  try {
    const id = '25xu5KZh1mQs8TdEbOgs';
    console.log(`Fetching product ${id}...`);
    const product = await getProductById(id);
    if (product) {
      console.log('✅ Product found:', product.title);
    } else {
      console.log('❌ Product not found (returned null)');
    }
  } catch (err) {
    console.error('❌ Error:', err);
  }
}

run();
