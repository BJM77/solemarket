
import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 24;

export async function getProducts(searchParams: ProductSearchParams): Promise<{ products: Product[], hasMore: boolean }> {

  const { page = 1, sort = 'createdAt-desc', q, category, categories, subCategory, conditions, priceRange, sellers, yearRange } = searchParams;

  const productsRef = collection(db, 'products');
  let constraints: QueryConstraint[] = [where('isDraft', '==', false)];

  // Build constraints based on search params

  // Handle Multi-select Categories
  if (categories && categories.length > 0) {
    constraints.push(where('category', 'in', categories.slice(0, 30)));
  } else if (category) {
    // Fallback for single category
    constraints.push(where('category', '==', category));
  }

  if (subCategory) {
    constraints.push(where('subCategory', '==', subCategory));
  }
  if (conditions && conditions.length > 0) {
    constraints.push(where('condition', 'in', conditions));
  }
  if (sellers && sellers.length > 0) {
    constraints.push(where('sellerId', 'in', sellers.slice(0, 30)));
  }

  // Firestore allows only ONE field to have inequality filters.
  // We prioritize Price Range for DB filtering as it's more common.
  // Year Range will be filtered in-memory if Price Range is also active.
  let filterYearInMemory = false;

  if (priceRange) {
    if (priceRange[0] > 0) {
      constraints.push(where('price', '>=', priceRange[0]));
    }
    if (priceRange[1] < 10000) {
      constraints.push(where('price', '<=', priceRange[1]));
    }
    // If price range is active, we MUST filter year in memory
    if (yearRange) {
      filterYearInMemory = true;
    }
  } else if (yearRange) {
    // No price range, so we can use DB filtering for year
    if (yearRange[0] > 1900) {
      constraints.push(where('year', '>=', yearRange[0]));
    }
    if (yearRange[1] < new Date().getFullYear()) {
      constraints.push(where('year', '<=', yearRange[1]));
    }
  }

  const [sortField, sortDirection] = sort.split('-') as ['createdAt' | 'price' | 'year' | 'views' | 'title', 'asc' | 'desc'];

  // If we rely on inequality, the first orderBy must be on that field.
  // Firestore Requirement: "If you include a filter with a range comparison (<, <=, >, >=), your first ordering must be on the same field."
  let orderByConstraints: QueryConstraint[] = [];

  if (priceRange && (priceRange[0] > 0 || priceRange[1] < 10000)) {
    if (sortField !== 'price') {
      // We must order by price first, then the user's sort.
      orderByConstraints.push(orderBy('price', sortDirection === 'desc' ? 'desc' : 'asc'));

      orderByConstraints.push(orderBy(sortField, sortDirection));
    } else {
      orderByConstraints.push(orderBy('price', sortDirection));
    }
  } else if (!filterYearInMemory && yearRange && (yearRange[0] > 1900 || yearRange[1] < new Date().getFullYear())) {
    // Filtering by Year in DB
    // Ensure sorting by year is handled
    if (sortField !== 'year') {
      orderByConstraints.push(orderBy('year', sortDirection === 'desc' ? 'desc' : 'asc'));
      orderByConstraints.push(orderBy(sortField, sortDirection));
    } else {
      orderByConstraints.push(orderBy('year', sortDirection));
    }
  } else {
    // No range filters, standard sort
    orderByConstraints.push(orderBy(sortField, sortDirection));
  }

  // Apply constraints
  const finalConstraints = [...constraints, ...orderByConstraints];

  // Pagination
  // Note: Pagination with in-memory filtering (Search, Year override) is tricky.
  // We'll fetch a larger batch if we know we are filtering in memory, but for now stick to PAGE_SIZE
  // and accept that pages might be shorter.

  let finalQuery: Query<DocumentData>;

  if (page > 1) {
    const prevPageLimit = (page - 1) * PAGE_SIZE;
    const prevPagesQuery = query(productsRef, ...finalConstraints, limit(prevPageLimit));
    const prevPagesSnapshot = await getDocs(prevPagesQuery);
    const lastVisible = prevPagesSnapshot.docs[prevPagesSnapshot.docs.length - 1];

    if (lastVisible) {
      finalQuery = query(productsRef, ...finalConstraints, startAfter(lastVisible), limit(PAGE_SIZE));
    } else {
      finalQuery = query(productsRef, ...finalConstraints, limit(PAGE_SIZE));
    }
  } else {
    finalQuery = query(productsRef, ...finalConstraints, limit(PAGE_SIZE));
  }

  const querySnapshot = await getDocs(finalQuery);

  let products = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Product));

  // In-Memory Filters
  if (q) {
    const lowercasedTerm = q.toLowerCase();
    products = products.filter(p => p.title.toLowerCase().includes(lowercasedTerm) || (p.description && p.description.toLowerCase().includes(lowercasedTerm)));
  }

  if (filterYearInMemory && yearRange) {
    products = products.filter(p => {
      if (!p.year) return false;
      return p.year >= yearRange[0] && p.year <= yearRange[1];
    });
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
