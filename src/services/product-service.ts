
import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData, doc, getDoc } from 'firebase/firestore';
import { serializeFirestoreData } from '@/lib/utils';

const PAGE_SIZE = 24;

export async function getProducts(searchParams: ProductSearchParams, userRole: string = 'viewer'): Promise<{ products: Product[], hasMore: boolean, lastVisibleId?: string, totalCount?: number }> {
  const { page = 1, sort = 'createdAt-desc', q, category, categories, subCategory, conditions, priceRange, sellers, yearRange, isUntimed } = searchParams;

  const productsRef = collection(db, 'products');
  let constraints: QueryConstraint[] = [];

  // Admin sees all, others see only 'available'
  if (userRole === 'admin' || userRole === 'superadmin') {
    // Admins can see everything, but usually want to see non-drafts unless specified
    // We'll leave it open or filter by status if provided in searchParams
    // If no specific filter, maybe show all?
    // For the main grid, we usually don't want 'sold' items unless asked.
    // But for now, let's just NOT filter by status if admin, unless they want to.
    if (searchParams.status) {
      constraints.push(where('status', '==', searchParams.status));
    } else {
      constraints.push(where('isDraft', '==', false)); // Legacy/Basic check
    }
  } else {
    // Public/Business/Seller
    constraints.push(where('status', '==', 'available'));
  }


  // Build constraints based on search params

  // Handle Multi-select Categories
  if (categories && categories.length > 0) {
    constraints.push(where('category', 'in', categories.slice(0, 10)));
  } else if (category) {
    // Fallback for single category
    constraints.push(where('category', '==', category));
  }

  if (subCategory) {
    constraints.push(where('subCategory', '==', subCategory));
  }
  if (conditions && conditions.length > 0) {
    constraints.push(where('condition', 'in', conditions.slice(0, 10)));
  }
  if (searchParams.sizes && searchParams.sizes.length > 0) {
    // Firestore 'in' limitation: max 10. 
    constraints.push(where('size', 'in', searchParams.sizes.slice(0, 10)));
  }
  if (sellers && sellers.length > 0) {
    constraints.push(where('sellerId', 'in', sellers.slice(0, 10)));
  }

  // Verified Only Filter
  if (searchParams.verifiedOnly) {
    constraints.push(where('sellerVerified', '==', true));
  }

  // Untimed Filter
  if (isUntimed !== undefined) {
    constraints.push(where('isUntimed', '==', isUntimed));
  }

  // Multibuy Filter
  if (searchParams.multibuyEnabled) {
    constraints.push(where('multibuyEnabled', '==', true));
  }

  // Firestore allows only ONE field to have inequality filters.
  // We prioritize 'range' filters in this order:
  // 1. Text Search (q) - Prefix search on title_lowercase (REQUIRES sort by title_lowercase)
  // 2. Price Range - Inequality on price (REQUIRES sort by price)
  // 3. Year Range - Inequality on year (REQUIRES sort by year)

  // NOTE: If multiple range filters are requested, we can only support ONE in Firestore.
  // The others must be done in-memory.
  // Priority: Search > Price > Year (because Search is the most "active" user intent)

  let filterYearInMemory = false;
  let filterPriceInMemory = false;

  const [sortField, sortDirection] = sort.split('-') as ['createdAt' | 'price' | 'year' | 'views' | 'title', 'asc' | 'desc'];
  let orderByConstraints: QueryConstraint[] = [];

  if (q) {
    // SCENARIO 1: TEXT SEARCH
    const qLower = q.toLowerCase().trim();

    // STRATEGY: Use 'array-contains' on 'keywords' to find words ANYWHERE in the title.
    // e.g. "Jordan" finds "Michael Jordan"
    // LIMITATION: 'array-contains' requires exact match of the token. "Jord" won't find "Jordan".
    // LIMITATION: One 'array-contains' clause per query.
    // LIMITATION: Can't combine with other inequality filters easily in some cases.

    // If query is a single word, use array-contains on keywords
    if (qLower.split(/\s+/).length === 1 && qLower.length > 2) {
      constraints.push(where('keywords', 'array-contains', qLower));

      // We don't strictly need to sort by title_lowercase, but it helps stability
      // orderByConstraints.push(orderBy('title_lowercase', 'asc')); 
    } else {
      // Fallback to Prefix Search for multi-word or short queries
      // Prefix Search: title >= "batman" AND title <= "batman" + "\uf8ff"
      constraints.push(where('title_lowercase', '>=', qLower));
      constraints.push(where('title_lowercase', '<=', qLower + '\uf8ff'));

      // FORCED SORT: Must sort by title_lowercase ASC for prefix search to work
      orderByConstraints.push(orderBy('title_lowercase', 'asc'));
    }

    // Any other range filters (Price, Year) must be done IN-MEMORY
    if (priceRange) filterPriceInMemory = true;
    if (yearRange) filterYearInMemory = true;

  } else if (priceRange && ((priceRange[0] > 0) || (priceRange[1] < 10000))) {
    // SCENARIO 2: PRICE RANGE (No Search)
    constraints.push(where('price', '>=', priceRange[0]));
    constraints.push(where('price', '<=', priceRange[1]));

    // Must sort by price first
    if (sortField !== 'price') {
      orderByConstraints.push(orderBy('price', sortDirection === 'desc' ? 'desc' : 'asc')); // Primary sort to satisfy range
      orderByConstraints.push(orderBy(sortField, sortDirection)); // Secondary sort
    } else {
      orderByConstraints.push(orderBy('price', sortDirection));
    }

    if (yearRange) filterYearInMemory = true;

  } else if (yearRange && ((yearRange[0] > 1900) || (yearRange[1] < new Date().getFullYear()))) {
    // SCENARIO 3: YEAR RANGE (No Search, No Price)
    // Note: we check filterYearInMemory here just to be safe, but logic above sets it false initially
    if (!filterYearInMemory) {
      constraints.push(where('year', '>=', yearRange[0]));
      constraints.push(where('year', '<=', yearRange[1]));

      if (sortField !== 'year') {
        orderByConstraints.push(orderBy('year', sortDirection === 'desc' ? 'desc' : 'asc'));
        orderByConstraints.push(orderBy(sortField, sortDirection));
      } else {
        orderByConstraints.push(orderBy('year', sortDirection));
      }
    }
  } else {
    // SCENARIO 4: STANDARD SORT (No Ranges)
    // No inequality filters, so we can sort by whatever we want.
    // Prioritize Featured items if no range filters interfere
    // IMPORTANT: Firestore queries with orderBy(field) exclude documents missing that field.
    if (sortField === 'createdAt' || sortField === 'views') {
      orderByConstraints.push(orderBy('isFeatured', 'desc'));
    }
    orderByConstraints.push(orderBy(sortField, sortDirection));
  }

  // Apply constraints
  const finalConstraints = [...constraints, ...orderByConstraints];

  let finalQuery: Query<DocumentData>;

  if (searchParams.lastId) {
    const lastDocRef = doc(db, 'products', searchParams.lastId);
    const lastDocSnap = await getDoc(lastDocRef);

    if (lastDocSnap.exists()) {
      finalQuery = query(productsRef, ...finalConstraints, startAfter(lastDocSnap), limit(PAGE_SIZE));
    } else {
      return { products: [], hasMore: false };
    }
  } else {
    finalQuery = query(productsRef, ...finalConstraints, limit(PAGE_SIZE));
  }

  try {
    const querySnapshot = await getDocs(finalQuery);

    let products = querySnapshot.docs.map(doc => serializeFirestoreData({
      id: doc.id,
      ...doc.data()
    }) as Product);

    // In-Memory Filters
    const now = new Date();

    // Tiered Access Filtering
    const isBusinessOrHigher = userRole === 'business' || userRole === 'admin' || userRole === 'superadmin';

    products = products.filter(p => {
      // 1. Text Search - Handled by Firestore Prefix Search (see getProducts constraints)

      // 2. Year Filter (in memory)
      if (filterYearInMemory && yearRange && p.year) {
        // Manual check for yearRange existence to satisfy TS, though logic guarantees it
        if (p.year < yearRange[0] || p.year > yearRange[1]) return false;
      }

      // 3. Public Release Timing (for non-business/non-admin)
      if (!isBusinessOrHigher) {
        const releaseAt = p.publicReleaseAt as any;
        if (releaseAt) {
          // Handle Firestore Timestamp or Date object or serialized
          let releaseDate: Date | null = null;
          if (typeof releaseAt.toDate === 'function') {
            releaseDate = releaseAt.toDate();
          } else if (releaseAt.seconds) {
            releaseDate = new Date(releaseAt.seconds * 1000);
          } else if (releaseAt instanceof Date) {
            releaseDate = releaseAt;
          }

          if (releaseDate && releaseDate > now) {
            return false; // Not yet public
          }
        }
      }

      // 4. Multibuy Filter (Removed in favor of Firestore filter)
      // if (searchParams.multibuyEnabled && !p.multibuyEnabled) {
      //   return false;
      // }

      return true;
    });

    const hasMore = querySnapshot.docs.length === PAGE_SIZE;
    const lastVisibleId = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1].id : undefined;

    let totalCount: number | undefined = undefined;
    // Only fetch count on first page to save reads
    // OPTIMIZATION: Skip count for text searches (q) as it requires a full collection scan matches
    if (!searchParams.lastId && page === 1 && !q) {
      try {
        const countQuery = query(productsRef, ...constraints);
        const snapshot = await import('firebase/firestore').then(mod => mod.getCountFromServer(countQuery));
        totalCount = snapshot.data().count;
      } catch (e) {
        console.error("Failed to count products", e);
      }
    }

    const result = { products, hasMore, lastVisibleId, totalCount };

    return result;
  } catch (error: any) {
    console.error("Error in getProducts:", error.message);
    if (error.code === 'failed-precondition') {
      console.warn("Firestore index missing. Returning empty results to prevent crash.");
    }
    return { products: [], hasMore: false };
  }
}

export async function getAllProducts(): Promise<Product[]> {
  const productsRef = collection(db, 'products');
  const q = query(productsRef, where('status', '==', 'available'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const products = querySnapshot.docs.map(doc => serializeFirestoreData({
    id: doc.id,
    ...doc.data()
  }) as Product);
  return products;
}
