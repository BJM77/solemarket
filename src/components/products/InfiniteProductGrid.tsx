'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { getProducts } from '@/services/product-service';
import type { Product, ProductSearchParams, UserProfile } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Loader2, Filter, Grid } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { CollectorCardsFilterTrigger } from '../filters/collector-cards-filter-trigger';
import AdvancedFilterPanel from '../filters/AdvancedFilterPanel';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { motion } from 'framer-motion';
import MontageGrid from './MontageGrid';
import Image from 'next/image';
import Link from 'next/link';

type ViewMode = 'grid' | 'list' | 'montage';
const PAGE_SIZE = 24;

const CONDITION_OPTIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];


function InfiniteProductGridInner({ pageTitle, pageDescription, initialFilterState = {} }: { pageTitle: string, pageDescription?: string, initialFilterState?: Partial<ProductSearchParams> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);

  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const pageRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef<IntersectionObserver>();

  const currentSearchParams = useMemo(() => {
    const params: ProductSearchParams = { ...initialFilterState };
    searchParams.forEach((value, key) => {
      if (key === 'priceRange') {
        params[key] = value.split(',').map(Number) as [number, number];
      } else if (key === 'conditions' || key === 'sellers') {
        params[key] = value.split(',');
      } else {
        params[key] = value;
      }
    });
    return params;
  }, [searchParams, initialFilterState]);

  // Filter specific states, derived from URL
  const viewMode = (currentSearchParams.view as ViewMode) || 'grid';
  const sortOrder = currentSearchParams.sort || 'createdAt-desc';
  const priceRange = currentSearchParams.priceRange || [0, 5000];
  const selectedConditions = useMemo(() => currentSearchParams.conditions || [], [currentSearchParams.conditions]);
  const selectedSellers = useMemo(() => currentSearchParams.sellers || [], [currentSearchParams.sellers]);

  const [postcode, setPostcode] = useState<string>("");
  const [isExclusionMode, setIsExclusionMode] = useState<boolean>(false);

  const { user } = useUser();

  const usersQuery = useMemoFirebase(() => {
    // Only query users if authenticated to avoid permission errors
    if (!user) return null;
    return query(collection(db, 'users'), where('accountType', '==', 'seller'));
  }, [user]);
  const { data: fetchedUsers } = useCollection<UserProfile>(usersQuery);

  const availableSellers = useMemo(() => {
    if (!fetchedUsers) return [];
    return fetchedUsers as unknown as UserProfile[];
  }, [fetchedUsers]);


  const createQueryString = useCallback(
    (newParams: Record<string, string | string[] | [number, number] | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(newParams)) {
        if (value && Array.isArray(value) && value.length > 0) {
          params.set(key, value.join(','));
        } else if (value && !Array.isArray(value)) {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleFilterChange = useCallback((key: string, value: string | string[] | [number, number] | null) => {
    const newQuery = createQueryString({ [key]: value, page: null });
    router.push(`${pathname}?${newQuery}`, { scroll: false });
  }, [createQueryString, pathname, router]);

  const handleViewChange = (mode: ViewMode) => {
    handleFilterChange('view', mode);
  };

  const loadMoreProducts = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    pageRef.current += 1;

    try {
      const { products: newProducts, hasMore: newHasMore } = await getProducts({
        ...currentSearchParams,
        page: pageRef.current,
        limit: PAGE_SIZE,
      });

      setProducts(prev => {
        if (pageRef.current === 1) return newProducts;
        const uniqueIds = new Set(prev.map(p => p.id));
        const filteredNewProducts = newProducts.filter(p => !uniqueIds.has(p.id));
        return [...prev, ...filteredNewProducts];
      });

      hasMoreRef.current = newHasMore;
      setHasMore(newHasMore);

    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [currentSearchParams]);

  useEffect(() => {
    pageRef.current = 0;
    setProducts([]);
    hasMoreRef.current = true;
    setHasMore(true);
    loadingRef.current = false;
    setLoading(true);
    loadMoreProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingRef.current) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMoreRef.current) {
        loadMoreProducts();
      }
    });

    if (node) observer.current.observe(node);
  }, [loadMoreProducts]);

  const renderProducts = () => {
    if (products.length === 0 && loading) {
      return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-8">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="bg-muted aspect-[5/7] rounded-lg shimmer" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4 shimmer" />
                <div className="h-5 bg-muted rounded w-1/2 shimmer" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (products.length === 0 && !loading) {
      return (
        <p className="col-span-full text-center text-muted-foreground py-12">
          No products found matching your criteria.
        </p>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="space-y-4">
          {products.map((product, index) => {
            const isLastElement = index === products.length - 1;
            return <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              ref={isLastElement ? lastProductElementRef : null}
              key={`${product.id}-${index}`}>
              <ProductCard product={product} viewMode={viewMode} />
            </motion.div>
          })}
        </div>
      );
    }

    if (viewMode === 'montage') {
      return <MontageGrid products={products} lastProductRef={lastProductElementRef} />;
    }


    return (
      <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-8">
        {products.map((product, index) => {
          const isLastElement = index === products.length - 1;
          return <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, delay: (index % PAGE_SIZE) * 0.05 }}
            ref={isLastElement ? lastProductElementRef : null}
            key={`${product.id}-${index}`}>
            <ProductCard product={product} viewMode={viewMode} />
          </motion.div>
        })}
      </motion.div>
    );
  };

  const handleConditionSelection = useCallback((c: string) => {
    const newConditions = selectedConditions.includes(c)
      ? selectedConditions.filter(sc => sc !== c)
      : [...selectedConditions, c];
    handleFilterChange('conditions', newConditions.length > 0 ? newConditions : null);
  }, [selectedConditions, handleFilterChange]);

  const handleSellerSelection = useCallback((sellerId: string) => {
    const newSellers = selectedSellers.includes(sellerId)
      ? selectedSellers.filter(id => id !== sellerId)
      : [...selectedSellers, sellerId];
    handleFilterChange('sellers', newSellers.length > 0 ? newSellers : null);
  }, [selectedSellers, handleFilterChange]);

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8 min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
        <div>
          <PageHeader title={pageTitle} description={pageDescription} />
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
          <Select value={sortOrder} onValueChange={(v) => handleFilterChange('sort', v)}>
            <SelectTrigger className="w-[180px] h-10 hidden sm:flex">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="hidden sm:flex items-center rounded-md border bg-card p-1 h-10">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => handleViewChange('grid')}><LayoutGrid /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => handleViewChange('list')}><List /></Button>
            <Button variant={viewMode === 'montage' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => handleViewChange('montage')}><Grid /></Button>
          </div>
          <AdvancedFilterPanel
            currentFilters={currentSearchParams}
            onFilterChange={(newFilters) => {
              const newQuery = createQueryString(newFilters);
              router.push(`${pathname}?${newQuery}`, { scroll: false });
            }}
            onClearFilters={() => router.push(pathname, { scroll: false })}
          />
        </div>
      </header>

      {renderProducts()}

      {loading && products.length > 0 && (
        <div className="flex justify-center mt-8">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>You&apos;ve reached the end of the list.</p>
        </div>
      )}
    </div>
  );
}

export default function InfiniteProductGrid(props: { pageTitle: string, pageDescription?: string, initialFilterState?: Partial<ProductSearchParams> }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>}>
      <InfiniteProductGridInner {...props} />
    </Suspense>
  )
}
