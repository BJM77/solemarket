
import { getProducts } from '@/services/product-service';

async function main() {
    console.log('Running Multibuy Query to capture index error...');
    try {
        await getProducts({
            multibuyEnabled: true,
            sort: 'createdAt-desc', // Ensure we use the sort order that triggers the index
            page: 1,
            limit: 10
        });
        console.log('Query Success (Index might already exist!)');
    } catch (e: any) {
        console.log('Caught Error:', e.message);
        console.log('Full Error:', JSON.stringify(e, null, 2));
    }
    process.exit(0);
}

main();
