import { db } from './src/lib/firebase/config';
import { collection, query, getDocs, deleteDoc, doc, where } from 'firebase/firestore';

async function cleanupTestProducts() {
    console.log('Searching for test products...');
    const productsRef = collection(db, 'products');
    // Match any title starting with 'Test' (case sensitive) or containing 'Test'
    const q = query(productsRef);
    const querySnapshot = await getDocs(q);

    let deletedCount = 0;
    for (const productDoc of querySnapshot.docs) {
        const title = productDoc.data().title || '';
        if (title.includes('Test') || title.includes('test')) {
            console.log(`Deleting: ${title} (${productDoc.id})`);
            await deleteDoc(doc(db, 'products', productDoc.id));
            deletedCount++;
        }
    }

    console.log(`Cleanup complete. Deleted ${deletedCount} test products.`);
}

cleanupTestProducts().catch(console.error);
