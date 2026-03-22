
import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData, doc, getDoc } from 'firebase/firestore';
import { serializeFirestoreData } from '@/lib/utils';
import { normalizeCategory, RELATED_CATEGORIES } from '@/lib/constants/marketplace';

const PAGE_SIZE = 24;

export async function getProducts(searchParams: ProductSearchParams, userRole: string = 'viewer'): Promise<{ products: Product[], hasMore: boolean, lastVisibleId?: string, totalCount?: number }> {
  const { page = 1, sort = 'createdAt-desc', q, subCategory, brand, conditions, priceRange, sellers, yearRange, isUntimed, gradingCompanies, manufacturer } = searchParams;
  let category = searchParams.category ? normalizeCategory(searchParams.category) : undefined;
  let categories = searchParams.categories?.map((c: string) => normalizeCategory(c));

  const productsRef = collection(db, 'products');
  let constraints: QueryConstraint[] = [];

  // 1. Status Filter (Security & Visibility)
  if (userRole === 'admin' || userRole === 'superadmin') {
    if (searchParams.status) {
      constraints.push(where('status', '==', searchParams.status));
    }
    // We will filter out 'deleted' in memory for admins later to avoid query restrictions
  } else {
    // Normal users and visitors ONLY see available listings - this is an exact match query, very fast and indexed.
    constraints.push(where('status', '==', 'available'));
  }


  // Build constraints based on search params

  // Firestore allows only ONE 'in' filter per query.
  // We prioritize: category > size > condition > sellers
  let inFilterUsed = false;
  
  // Normalize and ensure arrays for multi-select filters
  const selectedConditions = Array.isArray(conditions) ? conditions : (conditions ? [conditions] : []);
  const selectedSizes = Array.isArray(searchParams.sizes) ? searchParams.sizes : (searchParams.sizes ? [searchParams.sizes] : []);
  const selectedSellers = Array.isArray(sellers) ? sellers : (sellers ? [sellers] : []);
  const selectedGrading = Array.isArray(gradingCompanies) ? gradingCompanies : (gradingCompanies ? [gradingCompanies] : []);
  const selectedTiers = Array.isArray(searchParams.multiCardTiers) ? searchParams.multiCardTiers : (searchParams.multiCardTiers ? [searchParams.multiCardTiers] : []);

  let filterConditionsInMemory: string[] | null = null;
  let filterSizesInMemory: string[] | null = null;
  let filterSellersInMemory: string[] | null = null;
  let filterGradingInMemory: string[] | null = null;
  let filterTiersInMemory: string[] | null = null;

  // Handle Multi-select Categories or Expand Single Category to Related
  if (categories && categories.length > 0) {
    if (categories.length === 1) {
      const related = RELATED_CATEGORIES[categories[0]];
      if (related && related.length > 1) {
        constraints.push(where('category', 'in', related));
        inFilterUsed = true;
      } else {
        constraints.push(where('category', '==', categories[0]));
      }
    } else {
      constraints.push(where('category', 'in', categories.slice(0, 10)));
      inFilterUsed = true;
    }
  } else if (category) {
    // Single category: check for related terms (e.g. Sneakers -> [Sneakers, Shoes])
    const related = RELATED_CATEGORIES[category];
    if (related && related.length > 1) {
      constraints.push(where('category', 'in', related));
      inFilterUsed = true;
    } else {
      constraints.push(where('category', '==', category));
    }
  }

  let filterBrandInMemory: string | null = null;

  if (subCategory) {
    constraints.push(where('subCategory', '==', subCategory));
  }

  if (brand) {
    // Optimization: If brand and subCategory are the same, don't add both to Firestore to avoid index issues
    if (subCategory === brand) {
      filterBrandInMemory = brand;
    } else {
      constraints.push(where('brand', '==', brand));
    }
  }

  if (selectedConditions.length > 0) {
    if (selectedConditions.length === 1) {
      constraints.push(where('condition', '==', selectedConditions[0]));
    } else if (!inFilterUsed && selectedConditions.length > 1) {
      constraints.push(where('condition', 'in', selectedConditions.slice(0, 10)));
      inFilterUsed = true;
    } else {
      filterConditionsInMemory = selectedConditions;
    }
  }

  if (selectedSizes.length > 0) {
    if (selectedSizes.length === 1) {
      constraints.push(where('size', '==', selectedSizes[0]));
    } else if (!inFilterUsed && selectedSizes.length > 1) {
      constraints.push(where('size', 'in', selectedSizes.slice(0, 10)));
      inFilterUsed = true;
    } else {
      filterSizesInMemory = selectedSizes;
    }
  }

  if (selectedSellers.length > 0) {
    if (selectedSellers.length === 1) {
      constraints.push(where('sellerId', '==', selectedSellers[0]));
    } else if (!inFilterUsed && selectedSellers.length > 1) {
      constraints.push(where('sellerId', 'in', selectedSellers.slice(0, 10)));
      inFilterUsed = true;
    } else {
      filterSellersInMemory = selectedSellers;
    }
  }

  // Card Specific Filters
  if (selectedGrading.length > 0) {
    if (selectedGrading.length === 1) {
      constraints.push(where('gradingCompany', '==', selectedGrading[0]));
    } else if (!inFilterUsed && selectedGrading.length > 1) {
      constraints.push(where('gradingCompany', 'in', selectedGrading.slice(0, 10)));
      inFilterUsed = true;
    } else {
      filterGradingInMemory = selectedGrading;
    }
  }

  if (manufacturer) {
    constraints.push(where('manufacturer', '==', manufacturer));
  }

  // Deal Tiers Filter
  if (selectedTiers.length > 0) {
    if (selectedTiers.length === 1) {
      constraints.push(where('multiCardTier', '==', selectedTiers[0]));
    } else if (!inFilterUsed && selectedTiers.length > 1) {
      constraints.push(where('multiCardTier', 'in', selectedTiers.slice(0, 10)));
      inFilterUsed = true;
    } else {
      filterTiersInMemory = selectedTiers;
    }
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

  // Handle sort aliases and potential missing directions
  let effectiveSort = sort;
  if (sort === 'newest') effectiveSort = 'createdAt-desc';
  if (sort === 'price-asc' || sort === 'price-desc') effectiveSort = sort;
  if (!effectiveSort.includes('-')) effectiveSort = 'createdAt-desc';

  const [sortField, sortDirection] = effectiveSort.split('-') as ['createdAt' | 'price' | 'year' | 'views' | 'title', 'asc' | 'desc'];
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
    // Standard Sort (No Ranges)
    // No inequality filters, so we can sort by whatever we want.
    // NOTE: Removed orderBy('isFeatured') as it excludes documents missing the field.
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

    let products = querySnapshot.docs.map((doc: any) => serializeFirestoreData({
      id: doc.id,
      ...doc.data()
    }) as Product);

    // In-Memory Filters
    const now = new Date();

    // Tiered Access Filtering
    const isBusinessOrHigher = userRole === 'business' || userRole === 'admin' || userRole === 'superadmin';

    products = products.filter((p: Product) => {
      // 0. Logical Delete Filter (Admins only, normal users handled by Firestore query above)
      if ((userRole === 'admin' || userRole === 'superadmin') && !searchParams.status && p.status === 'deleted') {
        return false;
      }

      // 1. Text Search - Handled by Firestore Prefix Search (see getProducts constraints)

      // 2. Year Filter (in memory)
      if (filterYearInMemory && yearRange) {
        const itemYear = p.year ? Number(p.year) : null;
        if (!itemYear || itemYear < yearRange[0] || itemYear > yearRange[1]) return false;
      }

      // 3. Condition Filter (in memory if multiple conditions and 'in' already used)
      if (filterConditionsInMemory) {
        if (!p.condition || !filterConditionsInMemory.includes(p.condition)) return false;
      }

      // 4. Size Filter (in memory if multiple sizes and 'in' already used)
      if (filterSizesInMemory && filterSizesInMemory.length > 0) {
        if (!p.size) return false;
        
        // Normalize for comparison (e.g. "10" vs "US 10")
        const normalizeSize = (s: string) => s.toUpperCase().startsWith('US ') ? s.toUpperCase() : `US ${s.toUpperCase()}`;
        const normalizedItemSize = normalizeSize(p.size);
        const normalizedFilterSizes = filterSizesInMemory.map(normalizeSize);
        
        if (!normalizedFilterSizes.includes(normalizedItemSize)) return false;
      }

      // 5. Seller Filter (in memory if multiple sellers and 'in' already used)
      if (filterSellersInMemory) {
        if (!p.sellerId || !filterSellersInMemory.includes(p.sellerId)) return false;
      }

      // 5b. Brand Filter (in memory if same as subCategory to save index)
      if (filterBrandInMemory) {
        if (!p.brand || p.brand.toLowerCase().trim() !== filterBrandInMemory.toLowerCase().trim()) return false;
      }

      // 6. Minimum Rating Filter (if present)
      if (searchParams.minRating && p.sellerRating !== undefined) {
        if (p.sellerRating < searchParams.minRating) return false;
      }

      // 7. Grading Filter (in memory)
      if (filterGradingInMemory) {
        if (!p.gradingCompany || !filterGradingInMemory.includes(p.gradingCompany)) return false;
      }

      // 8. Deal Tiers Filter (in memory)
      if (filterTiersInMemory) {
        if (!p.multiCardTier || !filterTiersInMemory.includes(p.multiCardTier)) return false;
      }

      // 9. Public Release Timing (for non-business/non-admin)
      if (!isBusinessOrHigher) {
        const releaseAt = p.publicReleaseAt as any;
        if (releaseAt) {
          // Handle Firestore Timestamp or Date object or serialized
          let releaseDate: Date | null = null;
          if (typeof releaseAt.toDate === 'function') {
            releaseDate = releaseAt.toDate();
          } else if (releaseAt.seconds) {
            releaseDate = new Date(releaseAt.seconds * 1000);
          } else if (releaseAt.value) {
            releaseDate = new Date(releaseAt.value);
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
        const firestoreMod = await import('firebase/firestore');
        if (firestoreMod && typeof firestoreMod.getCountFromServer === 'function') {
          const snapshot = await firestoreMod.getCountFromServer(countQuery);
          totalCount = snapshot.data().count;
        }
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
  const products = querySnapshot.docs.map((doc: any) => serializeFirestoreData({
    id: doc.id,
    ...doc.data()
  }) as Product);
  return products;
}
