import { db } from '../src/lib/firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

async function test() {
  const q = query(
    collection(db, 'products'),
    where('status', '==', 'available'),
    where('category', '==', 'Sneakers'),
    where('subCategory', '==', 'Jordan')
  );
  try {
    const snap = await getDocs(q);
    console.log(`Found ${snap.size} products for subCategory=Jordan`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`- ${d.id}: subCategory=${data.subCategory}, brand=${data.brand}`);
    });
  } catch (e: any) {
    console.error('Error:', e.message);
  }

  const q2 = query(
    collection(db, 'products'),
    where('status', '==', 'available'),
    where('category', '==', 'Sneakers'),
    where('brand', '==', 'Jordan')
  );
  try {
    const snap = await getDocs(q2);
    console.log(`Found ${snap.size} products for brand=Jordan`);
    snap.docs.forEach(d => {
      const data = d.data();
      console.log(`- ${d.id}: subCategory=${data.subCategory}, brand=${data.brand}`);
    });
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}
test();
