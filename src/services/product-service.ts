
import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData } from 'firebase/firestore';

const PAGE_SIZE = 24;

// Simple memory cache for products
interface CacheEntry {
  data: { products: Product[], hasMore: boolean };
  timestamp: number;
}
const productCache = new Map<string, CacheEntry>();
const CACHE_EXPIRATION_MS = 2 * 60 * 1000; // 2 minutes

export async function getProducts(searchParams: ProductSearchParams, userRole: string = 'viewer'): Promise<{ products: Product[], hasMore: boolean }> {
  // Create a unique key for the current search
  const cacheKey = JSON.stringify({ ...searchParams, userRole });

  // Check cache
  const cached = productCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_EXPIRATION_MS) {
    console.log('[CACHE HIT] Returning cached products for:', cacheKey);
    return cached.data;
  }

  const { page = 1, sort = 'createdAt-desc', q, category, categories, subCategory, conditions, priceRange, sellers, yearRange } = searchParams;

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

  // Verified Only Filter
  if (searchParams.verifiedOnly) {
    constraints.push(where('sellerVerified', '==', true));
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

  // Logic:
  // 1. If we have inequality filters (price/year range), we MUST sort by that field first. Featured sorting might be compromised or require client-side merge.
  // 2. If NO inequality filters, we can sort by isFeatured first.

  const hasInequalityFilter = (priceRange && (priceRange[0] > 0 || priceRange[1] < 10000)) ||
    (!filterYearInMemory && yearRange && (yearRange[0] > 1900 || yearRange[1] < new Date().getFullYear()));

  if (!hasInequalityFilter) {
    // Prioritize Featured items if no range filters interfere
    orderByConstraints.push(orderBy('isFeatured', 'desc'));
  }

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
  const now = new Date();

  // Tiered Access Filtering
  const isBusinessOrHigher = userRole === 'business' || userRole === 'admin' || userRole === 'superadmin';

  products = products.filter(p => {
    // 1. Text Search
    if (q) {
      const lowercasedTerm = q.toLowerCase();
      if (!p.title.toLowerCase().includes(lowercasedTerm) && (!p.description || !p.description.toLowerCase().includes(lowercasedTerm))) {
        return false;
      }
    }

    // 2. Year Filter (if in memory)
    if (filterYearInMemory && yearRange && p.year) {
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

    return true;
  });

  const hasMore = querySnapshot.docs.length === PAGE_SIZE;

  const result = { products, hasMore };

  // Store in cache
  productCache.set(cacheKey, { data: result, timestamp: Date.now() });

  return result;
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
