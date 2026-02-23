
import { getProductById } from '../src/lib/firebase/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function testFetch() {
  try {
    // Use one of the known IDs from the previous check
    const testId = '25xu5KZh1mQs8TdEbOgs'; 
    console.log(`Testing fetch for ID: ${testId}`);

    const product = await getProductById(testId);
    
    if (product) {
      console.log('✅ Successfully fetched product:', product.title);
    } else {
      console.log('❌ Failed to fetch product (returned null)');
    }
  } catch (error) {
    console.error('❌ Error executing test:', error);
  }
}

testFetch();
