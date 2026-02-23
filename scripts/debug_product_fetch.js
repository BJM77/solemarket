
const { register } = require('ts-node');
const path = require('path');

// Register ts-node to handle TypeScript files
register({
  project: path.resolve(__dirname, '../tsconfig.json'),
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node'
  }
});

// Mock Next.js environment variables if needed (dotenv is already loaded by ts-node if configured, but let's be safe)
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Manually register alias if tsconfig-paths doesn't kick in automatically for this simple script
const moduleAlias = require('module-alias');
moduleAlias.addAlias('@', path.resolve(__dirname, '../src'));

async function testFetch() {
  try {
    const { getProductById } = require('@/lib/firebase/firestore');
    
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
