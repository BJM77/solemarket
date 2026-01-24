'use client';

import type { Product } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

export interface FilterOptions {
  sortOrder?: string;
  priceRange?: [number, number];
  conditions?: string[];
  categories?: string[];
  subCategories?: string[];
  searchTerm?: string;
}

/**
 * Filters and sorts an array of products based on various criteria.
 * @param products - The array of products to filter.
 * @param filters - The filter criteria.
 * @returns A new array of filtered and sorted products.
 */
export function filterAndSortProducts(products: Product[], filters: FilterOptions): Product[] {
  let filteredProducts = [...products];

  // 1. Filter by Search Term (Title and Description)
  if (filters.searchTerm) {
    const lowercasedTerm = filters.searchTerm.toLowerCase();
    filteredProducts = filteredProducts.filter(p =>
      p.title.toLowerCase().includes(lowercasedTerm) ||
      (p.description && p.description.toLowerCase().includes(lowercasedTerm))
    );
  }

  // 2. Filter by Price Range
  if (filters.priceRange) {
    const [min, max] = filters.priceRange;
    filteredProducts = filteredProducts.filter(p => {
        const price = p.price || 0;
        const isGte = min === undefined || price >= min;
        const isLte = max === undefined || price <= max;
        return isGte && isLte;
    });
  }

  // 3. Filter by Condition
  if (filters.conditions && filters.conditions.length > 0) {
    filteredProducts = filteredProducts.filter(p =>
      filters.conditions!.includes(p.condition || '')
    );
  }
  
  // 4. Filter by Category
  if (filters.categories && filters.categories.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
          filters.categories!.includes(p.category || '')
      );
  }
  
  // 5. Filter by Sub-Category
  if (filters.subCategories && filters.subCategories.length > 0) {
      filteredProducts = filteredProducts.filter(p =>
          filters.subCategories!.includes(p.subCategory || '')
      );
  }

  // 6. Sort the results
  if (filters.sortOrder) {
    switch (filters.sortOrder) {
      case 'price-asc':
        filteredProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredProducts.sort((a, b) => b.price - a.price);
        break;
      case 'createdAt-desc':
      default:
        // Ensure createdAt is a Timestamp before using toMillis
        filteredProducts.sort((a, b) => {
            const aDate = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
            const bDate = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
            return bDate - aDate;
        });
        break;
    }
  }

  return filteredProducts;
}
