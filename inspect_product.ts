
import { db } from './src/lib/firebase/config';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function inspect() {
  try {
    const q = query(collection(db, 'products'), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      snap.forEach(doc => {
        console.log('Product ID:', doc.id);
        const data = doc.data();
        console.log('title_lowercase present:', 'title_lowercase' in data);
        console.log('title_lowercase value:', data.title_lowercase);
        console.log('title value:', data.title);
      });
    } else {
      console.log('No products found.');
    }
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
inspect();
