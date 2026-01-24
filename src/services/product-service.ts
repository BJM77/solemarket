
import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 24;

export async function getProducts(searchParams: ProductSearchParams): Promise<{ products: Product[], hasMore: boolean }> {
  
  const { page = 1, sort = 'createdAt-desc', q, category, subCategory, conditions, priceRange, sellers } = searchParams;

  const productsRef = collection(db, 'products');
  let constraints: QueryConstraint[] = [where('isDraft', '==', false)];

  // Build constraints based on search params
  if (category) {
      constraints.push(where('category', '==', category));
  }
  if (subCategory) {
      constraints.push(where('subCategory', '==', subCategory));
  }
  if (conditions && conditions.length > 0) {
      constraints.push(where('condition', 'in', conditions));
  }
  if (sellers && sellers.length > 0) {
      // Firestore 'in' query is limited to 30 items.
      constraints.push(where('sellerId', 'in', sellers.slice(0, 30)));
  }
  if (priceRange) {
      if (priceRange[0] > 0) {
          constraints.push(where('price', '>=', priceRange[0]));
      }
      if (priceRange[1] < 5000) { 
          constraints.push(where('price', '<=', priceRange[1]));
      }
  }

  const [sortField, sortDirection] = sort.split('-') as ['createdAt' | 'price', 'asc' | 'desc'];
  constraints.push(orderBy(sortField, sortDirection));

  let finalQuery: Query<DocumentData>;

  if (page > 1) {
    const prevPageLimit = (page - 1) * PAGE_SIZE;
    const prevPagesQuery = query(productsRef, ...constraints, limit(prevPageLimit));
    const prevPagesSnapshot = await getDocs(prevPagesQuery);
    const lastVisible = prevPagesSnapshot.docs[prevPagesSnapshot.docs.length - 1];
    
    if (lastVisible) {
      finalQuery = query(productsRef, ...constraints, startAfter(lastVisible), limit(PAGE_SIZE));
    } else {
      // This case handles if page number is out of bounds, though it shouldn't happen with correct hasMore logic
      finalQuery = query(productsRef, ...constraints, limit(PAGE_SIZE));
    }
  } else {
    finalQuery = query(productsRef, ...constraints, limit(PAGE_SIZE));
  }
  
  const querySnapshot = await getDocs(finalQuery);
  
  let products = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Product));

  // Client-side search filtering if 'q' is present
  if (q) {
      const lowercasedTerm = q.toLowerCase();
      products = products.filter(p => p.title.toLowerCase().includes(lowercasedTerm) || (p.description && p.description.toLowerCase().includes(lowercasedTerm)));
  }
  
  const hasMore = querySnapshot.docs.length === PAGE_SIZE;

  return { products, hasMore };
}

export async function getAllProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, where('isDraft', '==', false), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const products = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Product));
  return products;
}
