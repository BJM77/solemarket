import { POKEMON_SUBCATEGORIES, isPokemonListing, isPokemonSubCategory } from '@/lib/pokemon-listings';
import { isCoinListing, isCoinValue, matchesCoinFlags, wantsCoinsOnly } from '@/lib/coin-listings';
import { applyCoinFilters, parseCoinFilters } from '@/lib/coins/filters';

import { db } from '@/lib/firebase/config';
import type { Product, ProductSearchParams } from '@/lib/types';
import { collection, query, where, or, and, orderBy, limit, getDocs, startAfter, QueryConstraint, Timestamp, Query, DocumentData, doc, getDoc } from 'firebase/firestore';
import { serializeFirestoreData } from "@/lib/utils/serialization";
import { normalizeCategory, RELATED_CATEGORIES } from '@/lib/constants/marketplace';
import { parseRange, sizeQueryVariants, sizeMatches, applyClientSort, normalizeSize } from '@/lib/filters/params';
import { aliasesForTeamFilter } from '@/lib/filters/team-aliases';
import { isStorefrontSearchable, listingMatchesQuery } from '@/lib/search/inline';

const PAGE_SIZE = 24;

type ProductsResult = { products: Product[], hasMore: boolean, lastVisibleId?: string, totalCount?: number };

export async function getProducts(searchParams: ProductSearchParams & { countOnly?: boolean }, userRole: string = 'viewer'): Promise<ProductsResult> {
  // Benched Coins: one simple query for every live coin/bullion listing (the catalog is
  // small), then the coin filters and sorts run in memory, so no new Firestore indexes
  // are needed and basketball-only filters never apply.
  if (wantsCoinsOnly(searchParams)) {
    const coinFilters = parseCoinFilters(searchParams as Record<string, any>);
    const base = await queryProducts({
      coinsOnly: true,
      status: searchParams.status,
      category: searchParams.category,
      categories: searchParams.categories,
      lastId: searchParams.lastId,
      page: searchParams.page,
      countOnly: searchParams.countOnly,
    } as ProductSearchParams & { countOnly?: boolean }, userRole);
    if (searchParams.countOnly) return base;
    return { ...base, products: applyCoinFilters(base.products as any[], coinFilters, null) as Product[], totalCount: undefined };
  }
  return queryProducts(searchParams, userRole);
}

async function queryProducts(searchParams: ProductSearchParams & { countOnly?: boolean }, userRole: string = 'viewer'): Promise<ProductsResult> {
  const priceRange = parseRange(searchParams.priceRange as any);
  // Coins storefront: every query covers all coin + bullion categories, filtered in memory below.
  const coinsOnly = wantsCoinsOnly(searchParams);
  if (coinsOnly && !searchParams.category && !(searchParams.categories || []).length) searchParams = { ...searchParams, category: 'Coins' };
  const { page = 1, sort = 'createdAt-desc', q: rawQ, subCategory, brand, conditions, sellers, yearRange, isUntimed, gradingCompanies, manufacturer } = searchParams;
  // Coin listings often lack the keyword index fields, so the coins storefront
  // matches its (small) catalog's text in memory instead of with a Firestore prefix query.
  const coinTextTerms = coinsOnly && typeof rawQ === 'string' ? rawQ.toLowerCase().split(/\s+/).filter(Boolean) : [];
  const q = coinsOnly ? undefined : rawQ;
  const filterTextInMemory = typeof q === 'string' && q.trim().length > 0;
  const textQuery = filterTextInMemory ? q.trim() : '';
  let category = searchParams.category ? normalizeCategory(searchParams.category) : undefined;
  let categories = searchParams.categories?.map((c: string) => normalizeCategory(c));

  const productsRef = collection(db, 'products');
  let constraints: any[] = [];

  // TCG listings belong on /pokemon; main-site feeds leave them out unless
  // includePokemon (admin) or tcgOnly (the Pokémon & trading cards page) is set.
  const tcgOnly = searchParams.tcgOnly === true || String(searchParams.tcgOnly ?? '') === 'true';
  const wantsPokemon = isPokemonSubCategory(subCategory) || isPokemonSubCategory(brand);
  const hidePokemon = !tcgOnly && !searchParams.includePokemon;
  // Coins and bullion aren't part of benched.au; only the (future) coins storefront asks for them.
  const wantsCoins = isCoinValue(searchParams.category) || (searchParams.categories || []).some((c: string) => isCoinValue(c)) || isCoinValue(subCategory);
  const hideCoins = !coinsOnly && !wantsCoins && !searchParams.includeCoins;

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
  // Size of the single 'in' / array-contains-any filter; Firestore multiplies it with OR
  // branches when counting disjunctions (max 30 per query).
  let inFilterSize = 1;
  let brandOrBranches = 1;
  
  // Normalize and ensure arrays for multi-select filters
  const selectedConditions = Array.isArray(conditions) ? conditions : (conditions ? [conditions] : []);
  const selectedSizes = (Array.isArray(searchParams.sizes) ? searchParams.sizes : (searchParams.sizes ? [searchParams.sizes] : [])).map((x: string) => normalizeSize(x));
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
        inFilterSize = related.length;
      } else {
        constraints.push(where('category', '==', categories[0]));
      }
    } else {
      constraints.push(where('category', 'in', categories.slice(0, 10)));
      inFilterUsed = true;
        inFilterSize = Math.min(categories.length, 10);
    }
  } else if (category) {
    // Pokémon listings are all filed under the main cards category; skip the related-category
    // 'in' so the sub-category can use its own 'in' (and the existing index).
    const related = wantsPokemon && !tcgOnly ? undefined : RELATED_CATEGORIES[category];
    if (related && related.length > 1) {
      constraints.push(where('category', 'in', related));
      inFilterUsed = true;
        inFilterSize = related.length;
    } else {
      constraints.push(where('category', '==', category));
    }
  }

  // Removed filterBrandInMemory as it's now handled by Firestore OR

  if (subCategory && brand && subCategory === brand) {
    // If user is searching/filtering for a Top-level Brand like "Jordan", 
    // allow matching on subCategory OR brand OR Keywords (Title words) for maximum inclusivity.
    constraints.push(or(
      where('subCategory', '==', subCategory),
      where('brand', '==', brand),
      where('keywords', 'array-contains', subCategory.toLowerCase())
    ));
    brandOrBranches = 3;
    // Firestore OR logic handles multi-field inclusivity
  } else {
    if (subCategory && isPokemonSubCategory(subCategory) && !inFilterUsed && !tcgOnly) {
      // Existing Pokémon listings use several spellings; match them all.
      constraints.push(where('subCategory', 'in', POKEMON_SUBCATEGORIES));
      inFilterUsed = true;
      inFilterSize = POKEMON_SUBCATEGORIES.length;
    } else if (subCategory) {
      constraints.push(where('subCategory', '==', subCategory));
    }

    if (brand) {
      constraints.push(where('brand', '==', brand));
    }
  }

  if (selectedConditions.length > 0) {
    if (selectedConditions.length === 1) {
      constraints.push(where('condition', '==', selectedConditions[0]));
    } else if (!inFilterUsed && selectedConditions.length > 1) {
      constraints.push(where('condition', 'in', selectedConditions.slice(0, 10)));
      inFilterUsed = true;
        inFilterSize = Math.min(selectedConditions.length, 10);
    } else {
      filterConditionsInMemory = selectedConditions;
    }
  }

  if (selectedSizes.length > 0) {
    // Listings store sizes inconsistently ("10", "US 10", "US10"); match every spelling.
    if (!inFilterUsed) {
      constraints.push(where('size', 'in', sizeQueryVariants(selectedSizes)));
      inFilterUsed = true;
        inFilterSize = sizeQueryVariants(selectedSizes).length;
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
        inFilterSize = Math.min(selectedSellers.length, 10);
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
        inFilterSize = Math.min(selectedGrading.length, 10);
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
        inFilterSize = Math.min(selectedTiers.length, 10);
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
  if (!/^(createdAt|price|year|views)-(asc|desc)$/.test(effectiveSort)) effectiveSort = 'createdAt-desc';

  const [sortField, sortDirection] = effectiveSort.split('-') as ['createdAt' | 'price' | 'year' | 'views' | 'title', 'asc' | 'desc'];
  let orderByConstraints: QueryConstraint[] = [];

    if (filterTextInMemory) {
    // The header dropdown matches title/brand/player/model in a client-side
    // index. A Firestore keywords / title_lowercase prefix query misses
    // listings that lack those fields or have the term mid-title (e.g. "Jordan"
    // in "Air Jordan 1"). The live catalog is small enough to load and apply
    // the same token match in memory, so "See all results" agrees with the dropdown.
    if (priceRange) filterPriceInMemory = true;
    if (yearRange) filterYearInMemory = true;
    orderByConstraints.push(orderBy(sortField, sortDirection));

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
  let finalQuery: Query<DocumentData>;
  
  // If we have multiple filter constraints and any of them might be a composite filter (like our 'or' filter),
  // we follow the Firestore recommendation to wrap them in an 'and()' for stability.
  // Use the public QueryConstraint.type ('or' | 'and' | 'where' ...) rather than minified internals.
  const hasOrFilter = constraints.some(c => (c as any).type === 'or' || (c as any).type === 'and');
  
  let filterArgs: any[] = constraints;
  if (hasOrFilter && constraints.length > 1) {
    filterArgs = [and(...constraints)];
  }

  const queryArgs: any[] = [...filterArgs, ...orderByConstraints];

  // Server counts can't see in-memory filters; don't show a count that could be wrong.
  // Counts can't exclude TCG either, so skip them where TCG could be in the results.
  // tcgOnly always needs an in-memory count (Collector Cards also includes sports cards).
  const pokemonCouldAppear = tcgOnly || (hidePokemon && !(category && /sneaker|shoe|coin/i.test(category)) && !subCategory);
  // Same for coins: without a category filter, coin listings could be in the server count.
  const coinsCouldAppear = hideCoins && !category && !(categories && categories.length > 0);
  const countIsExact = !coinsOnly && !pokemonCouldAppear && !coinsCouldAppear && !filterTextInMemory && !(filterConditionsInMemory || filterSizesInMemory || filterSellersInMemory || filterGradingInMemory || filterTiersInMemory || filterPriceInMemory || filterYearInMemory || searchParams.minRating || searchParams.grades || searchParams.league || searchParams.team || searchParams.player || searchParams.model || searchParams.sizeGender);

  // Count-only mode: used by the filter panel to show "Show N results" before applying.
  if (searchParams.countOnly && !filterTextInMemory) {
    if (!countIsExact) return { products: [], hasMore: false };
    try {
      const firestoreMod = await import('firebase/firestore');
      const snapshot = await firestoreMod.getCountFromServer(query(productsRef, ...filterArgs));
      return { products: [], hasMore: false, totalCount: snapshot.data().count };
    } catch (e) {
      console.warn('Count failed', e);
      return { products: [], hasMore: false };
    }
  }

  // /pokemon asks for every TCG under Collector Cards and filters in memory;
  // the live catalog is small enough to load in one page.
  // The coins storefront filters coins vs bullion in memory; its catalog is small too.
  const pageSize = tcgOnly || coinsOnly || filterTextInMemory ? 500 : PAGE_SIZE;

  if (searchParams.lastId && !filterTextInMemory) {
    const lastDocRef = doc(db, 'products', searchParams.lastId);
    const lastDocSnap = await getDoc(lastDocRef);

    if (lastDocSnap.exists()) {
      finalQuery = query(productsRef, ...queryArgs, startAfter(lastDocSnap), limit(pageSize));
    } else {
      return { products: [], hasMore: false };
    }
  } else {
    finalQuery = query(productsRef, ...queryArgs, limit(pageSize));
  }

  try {
    const querySnapshot = await getDocs(finalQuery);

    let products = querySnapshot.docs.map((doc: any) => serializeFirestoreData({
      id: doc.id,
      ...doc.data()
    }) as Product);

    // Text search must include checked-in (sold) listings the header dropdown also
    // returns. Query them separately so we reuse the existing status==available
    // composite index and do not need a status-in + orderBy index.
    if (filterTextInMemory) {
      const seen = new Set(products.map((p: Product) => p.id));
      try {
        const soldSnap = await getDocs(query(productsRef, where('status', '==', 'sold'), limit(500)));
        for (const d of soldSnap.docs) {
          if (seen.has(d.id)) continue;
          const row = serializeFirestoreData({ id: d.id, ...d.data() }) as Product;
          if (!isStorefrontSearchable(row as any)) continue;
          products.push(row);
          seen.add(d.id);
        }
      } catch (e) {
        console.warn('Sold listing search backfill failed', e);
      }
    }

    // In-Memory Filters
    const now = new Date();

    // Tiered Access Filtering
    const isBusinessOrHigher = userRole === 'business' || userRole === 'admin' || userRole === 'superadmin';

    const isAdminView = userRole === 'admin' || userRole === 'superadmin';
    products = products.filter((p: Product) => {
      // 0. TCG listings live in the /pokemon section.
      if (hidePokemon && isPokemonListing(p)) return false;
      if (tcgOnly && !isPokemonListing(p)) return false;
      // 0b. Coins and bullion aren't listed on benched.au.
      if (hideCoins && isCoinListing(p)) return false;
      // 0c. The coins storefront only shows coins/bullion (never basketball cards or sneakers).
      if (!matchesCoinFlags(p, searchParams)) return false;
      if (coinTextTerms.length) {
        const hay = [p.title, p.description, p.brand, p.subCategory, p.year, (p as any).denomination, (p as any).metal, (p as any).country]
          .filter(Boolean).join(' ').toLowerCase();
        if (!coinTextTerms.every((t) => hay.includes(t))) return false;
      }
      if (filterTextInMemory && !listingMatchesQuery(p as any, textQuery)) return false;

      // 0a. Never show $0 / invalid-price listings publicly (they float to the top of price sorts).
      if (!isAdminView && !(Number(p.price) > 0)) return false;

      // 0. Logical Delete Filter (Admins only, normal users handled by Firestore query above)
      if ((userRole === 'admin' || userRole === 'superadmin') && !searchParams.status && p.status === 'deleted') {
        return false;
      }

      // 1. Text Search - listingMatchesQuery (same token match as the header dropdown)

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
        if (!sizeMatches(p.size, filterSizesInMemory)) return false;
      }

      // 5. Seller Filter (in memory if multiple sellers and 'in' already used)
      if (filterSellersInMemory) {
        if (!p.sellerId || !filterSellersInMemory.includes(p.sellerId)) return false;
      }

      // 5b. Brand Filter (handled by Firestore OR logic above)

      // 6. Minimum Rating Filter (if present)
      if (searchParams.minRating && p.sellerRating !== undefined) {
        if (p.sellerRating < searchParams.minRating) return false;
      }

      // 7. Grading Filter (in memory)
      if (filterGradingInMemory) {
        if (!p.gradingCompany || !filterGradingInMemory.includes(p.gradingCompany)) return false;
      }

      // 7b. Specific Grade Filter (in memory, e.g. "PSA 10", "BGS 9.5", "Raw")
      if (searchParams.grades && Array.isArray(searchParams.grades) && searchParams.grades.length > 0) {
        const rawGrade = String(p.grade || '').trim();
        const isRaw = !rawGrade || /^raw$/i.test(rawGrade);
        const gradeCo = (rawGrade.match(/^(PSA|BGS|CGC|SGC)/i)?.[1] || p.gradingCompany || '').toUpperCase();
        const gradeNum = rawGrade.replace(/^(PSA|BGS|CGC|SGC)\s*/i, '').trim();
        const matchesGrade = searchParams.grades.some((g: string) => {
          const target = String(g).trim();
          if (/^raw$/i.test(target)) return isRaw && !p.gradingCompany;
          if (isRaw) return false;
          const targetCo = (target.match(/^(PSA|BGS|CGC|SGC)/i)?.[1] || '').toUpperCase();
          const targetNum = target.replace(/^(PSA|BGS|CGC|SGC)\s*/i, '').trim();
          if (targetNum !== gradeNum) return false;
          return !targetCo || !gradeCo || targetCo === gradeCo;
        });
        if (!matchesGrade) return false;
      }

      // 7c. League Filter (in memory)
      if (searchParams.league) {
        const targetLeague = searchParams.league.toLowerCase();
        const fullText = `${p.title} ${p.description || ''} ${p.subCategory || ''}`.toLowerCase();
        if (!fullText.includes(targetLeague)) return false;
      }

      // 7d. Team Filter (in memory)
      if (searchParams.team) {
        const aliases = aliasesForTeamFilter(searchParams.team);
        const fullText = `${p.title} ${p.description || ''}`.toLowerCase();
        if (!aliases.some((a) => fullText.includes(a))) return false;
      }

      // 7e. Player Filter (in memory)
      if (searchParams.player) {
        const targetPlayer = searchParams.player.toLowerCase();
        const fullText = `${p.title} ${p.description || ''} ${p.subCategory || ''}`.toLowerCase();
        if (!fullText.includes(targetPlayer)) return false;
      }

      // 7f. Sneaker Model Filter (in memory)
      if (searchParams.model) {
        const targetModel = searchParams.model.toLowerCase();
        const fullText = `${p.model || ''} ${p.title}`.toLowerCase();
        if (!fullText.includes(targetModel)) return false;
      }

      // 7g. Sneaker Size Gender (in memory, whole-word match so "ships" or "kings" don't count as kids' sizes)
      if (searchParams.sizeGender && searchParams.sizeGender !== 'all') {
        const fullText = `${p.title} ${p.size || ''} ${p.description || ''}`.toLowerCase();
        const isWomens = /\b(women'?s?|womens|wmns|wms)\b/.test(fullText);
        const isKids = /\b(kids?'?|gs|ps|td|toddler|youth|grade school|preschool|infant)\b/.test(fullText);
        if (searchParams.sizeGender === 'women' && !isWomens) return false;
        if (searchParams.sizeGender === 'kids' && !isKids) return false;
        if (searchParams.sizeGender === 'men' && (isWomens || isKids)) return false;
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

    // Keep the page in the requested order regardless of legacy string prices.
    products = applyClientSort(products, effectiveSort);

    if (searchParams.countOnly && filterTextInMemory) {
      return { products: [], hasMore: false, totalCount: products.length };
    }

    if (filterTextInMemory) {
      let start = 0;
      if (searchParams.lastId) {
        const idx = products.findIndex((p: Product) => p.id === searchParams.lastId);
        start = idx >= 0 ? idx + 1 : 0;
      }
      const page = products.slice(start, start + PAGE_SIZE);
      return {
        products: page,
        hasMore: start + page.length < products.length,
        lastVisibleId: page.length ? page[page.length - 1].id : undefined,
        totalCount: searchParams.lastId ? undefined : products.length,
      };
    }

    const hasMore = querySnapshot.docs.length === pageSize;
    const lastVisibleId = querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1].id : undefined;

    let totalCount: number | undefined = undefined;
    // Only fetch count on first page to save reads
    // OPTIMIZATION: Skip count for text searches (q) as it requires a full collection scan matches
    if (!searchParams.lastId && page === 1 && !q && countIsExact) {
      try {
        const countQuery = query(productsRef, ...filterArgs);
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
