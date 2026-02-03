'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { getProducts } from '@/services/product-service';
import type { Product, ProductSearchParams, UserProfile } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import ProductCardSkeleton from '@/components/products/ProductCardSkeleton';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Loader2, Filter, Grid, Rows, CreditCard, Coins, Layers, ShieldCheck } from 'lucide-react';

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
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { bulkUpdateProductPrice } from '@/app/actions/product-updates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import PriceAssistantModal from '@/components/admin/PriceAssistantModal';


type ViewMode = 'grid' | 'list' | 'montage' | 'compact';
const PAGE_SIZE = 24;

const CONDITION_OPTIONS = ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];


function InfiniteProductGridInner({ pageTitle, pageDescription, initialFilterState = {}, isAdmin = false }: { pageTitle: string, pageDescription?: string, initialFilterState?: Partial<ProductSearchParams>, isAdmin?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hasMounted, setHasMounted] = useState(false);
  const { user } = useUser();
  const { userProfile } = useUserPermissions();
  const userRole = userProfile?.role;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading
  } = useInfiniteQuery({
    queryKey: ['products', currentSearchParams, userRole],
    queryFn: ({ pageParam = 1 }) => getProducts({
      ...currentSearchParams,
      page: pageParam,
      limit: PAGE_SIZE
    }, userRole as string),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });


  const products = useMemo(() => data?.pages.flatMap(page => page.products) ?? [], [data]);

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const { toast } = useToast();

  // Price Assistant State
  const [assistantProduct, setAssistantProduct] = useState<{ id: string, title: string, price: number } | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const observer = useRef<IntersectionObserver>();

  const currentSearchParams = useMemo(() => {
    const params: ProductSearchParams = { ...initialFilterState };
    searchParams.forEach((value, key) => {
      if (key === 'priceRange' || key === 'yearRange') {
        params[key] = value.split(',').map(Number) as [number, number];
      } else if (key === 'conditions' || key === 'sellers' || key === 'categories') {
        params[key] = value.split(',');
      } else if (key === 'verifiedOnly') {
        params[key] = value === 'true';
      } else {
        params[key] = value;
      }
    });
    return params;
  }, [searchParams, initialFilterState]);

  // Filter specific states, derived from URL
  const [viewMode, setViewMode] = useState<ViewMode>((currentSearchParams.view as ViewMode) || 'grid');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (currentSearchParams.view) {
      setViewMode(currentSearchParams.view as ViewMode);
    } else if (window.innerWidth < 640) {
      setViewMode('montage'); // Default to mosaic on mobile
    }
  }, [currentSearchParams.view]);

  const sortOrder = currentSearchParams.sort || 'createdAt-desc';
  const priceRange = currentSearchParams.priceRange || [0, 5000];
  const selectedConditions = useMemo(() => currentSearchParams.conditions || [], [currentSearchParams.conditions]);
  const selectedSellers = useMemo(() => currentSearchParams.sellers || [], [currentSearchParams.sellers]);

  const [postcode, setPostcode] = useState<string>("");
  const [isExclusionMode, setIsExclusionMode] = useState<boolean>(false);

  const { user } = useUser();
  const { userProfile } = useUserPermissions();
  const userRole = userProfile?.role;

  const usersQuery = useMemoFirebase(() => {
    // Only query users if authenticated to avoid permission errors
    if (!user) return null;
    return query(collection(db, 'users'), where('accountType', '==', 'seller'));
  }, [user?.uid]);
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

  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (isLoading || isFetchingNextPage) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) {
        fetchNextPage();
      }
    });

    if (node) observer.current.observe(node);
  }, [fetchNextPage, hasNextPage, isLoading, isFetchingNextPage]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  }, [products, selectedIds]);

  const handleBulkUpdatePrice = async () => {
    if (!bulkPrice || isNaN(Number(bulkPrice))) {
      toast({ title: "Invalid Price", variant: "destructive" });
      return;
    }

    setIsBulkUpdating(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Auth required");

      const result = await bulkUpdateProductPrice(Array.from(selectedIds), Number(bulkPrice), idToken);
      if (result.success) {
        toast({ title: "Bulk Update Successful", description: `Updated ${selectedIds.size} listings.` });
        setIsBulkDialogOpen(false);
        setSelectedIds(new Set());
        setIsSelectionMode(false);
        window.location.reload(); // Simple refresh for now
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const openPriceAssistant = useCallback((product: Product) => {
    setAssistantProduct({
      id: product.id,
      title: product.title,
      price: product.price
    });
    setIsAssistantOpen(true);
  }, []);

  const skeletonAspectRatio = useMemo(() => {
    const category = currentSearchParams.category || initialFilterState.category;
    if (category === 'Coins') return 'aspect-square';
    if (category === 'Memorabilia' || category === 'Collectibles' || category === 'General') return 'aspect-video';
    return 'aspect-[5/7]';
  }, [currentSearchParams.category, initialFilterState.category]);

  const renderProducts = () => {
    console.log('[DEBUG renderProducts]', {
      viewMode,
      productsLength: products.length,
      loading,
      hasMore,
      firstProductTitle: products[0]?.title
    });

    if (products.length === 0 && loading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-8">
          {[...Array(12)].map((_, i) => (
            <ProductCardSkeleton key={i} aspectRatio={skeletonAspectRatio} />
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
              <ProductCard
                product={product}
                viewMode={viewMode}
                isAdmin={isAdmin}
                selectable={isSelectionMode}
                selected={selectedIds.has(product.id)}
                onToggleSelect={() => toggleSelection(product.id)}
                onOpenPriceAssistant={openPriceAssistant}
              />
            </motion.div>
          })}
        </div>
      );
    }

    if (viewMode === 'montage') {
      return <MontageGrid products={products} lastProductRef={lastProductElementRef} isAdmin={isAdmin} onOpenPriceAssistant={openPriceAssistant} />;
    }

    if (viewMode === 'compact') {
      return (
        <div className="bg-card rounded-lg border shadow-sm divide-y">
          {products.map((product, index) => {
            const isLastElement = index === products.length - 1;
            return (
              <div ref={isLastElement ? lastProductElementRef : null} key={`${product.id}-${index}`}>
                <ProductCard
                  product={product}
                  viewMode="compact"
                  isAdmin={isAdmin}
                  selectable={isSelectionMode}
                  selected={selectedIds.has(product.id)}
                  onToggleSelect={() => toggleSelection(product.id)}
                  onOpenPriceAssistant={openPriceAssistant}
                />
              </div>
            );
          })}
        </div>
      );
    }


    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-8">
        {products.map((product, index) => {
          const isLastElement = index === products.length - 1;
          return <div
            ref={isLastElement ? lastProductElementRef : null}
            key={`${product.id}-${index}`}>
            <ProductCard
              product={product}
              viewMode={viewMode}
              isAdmin={isAdmin}
              selectable={isSelectionMode}
              selected={selectedIds.has(product.id)}
              onToggleSelect={() => toggleSelection(product.id)}
              onOpenPriceAssistant={openPriceAssistant}
            />
          </div>
        })}
      </div>
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
      <header className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-6">
        <div className="w-full sm:w-auto">
          <PageHeader title={pageTitle} description={pageDescription} />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          <Select value={sortOrder} onValueChange={(v) => handleFilterChange('sort', v)}>
            <SelectTrigger className="w-[140px] sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest</SelectItem>
              <SelectItem value="price-asc">Price: Low-High</SelectItem>
              <SelectItem value="price-desc">Price: High-Low</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-card border rounded-md p-0.5 sm:p-1 h-9 sm:h-10">
            <Button
              variant={currentSearchParams.category === 'Collector Cards' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-all", currentSearchParams.category === 'Collector Cards' && "bg-indigo-100 text-indigo-600")}
              asChild
              title="Cards"
            >
              <Link href="/collector-cards">
                <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button
              variant={currentSearchParams.category === 'Coins' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-all", currentSearchParams.category === 'Coins' && "bg-amber-100 text-amber-600")}
              asChild
              title="Coins"
            >
              <Link href="/coins">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Link>
            </Button>
            <Button
              variant={currentSearchParams.category === 'Memorabilia' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-all", currentSearchParams.category === 'Memorabilia' && "bg-emerald-100 text-emerald-600")}
              asChild
              title="Memorabilia"
            >
              <Link href="/collectibles">
                <span className="text-[10px] sm:text-xs font-bold">M</span>
              </Link>
            </Button>
            <Button
              variant={currentSearchParams.category === 'General' ? 'secondary' : 'ghost'}
              size="icon"
              className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-all", currentSearchParams.category === 'General' && "bg-slate-100 text-slate-600")}
              asChild
              title="General"
            >
              <Link href="/general">
                <span className="text-[10px] sm:text-xs font-bold">G</span>
              </Link>
            </Button>
          </div>


          <div className="flex items-center rounded-md border bg-card p-0.5 sm:p-1 h-9 sm:h-10">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleViewChange('grid')} title="Grid View"><LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
            <Button variant={viewMode === 'montage' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleViewChange('montage')} title="Mosaic View"><Grid className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden xs:flex" onClick={() => handleViewChange('list')} title="List View"><List className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
            <Button variant={viewMode === 'compact' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex" onClick={() => handleViewChange('compact')} title="Compact View"><Rows className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-2 bg-card border rounded-md px-3 h-9 sm:h-10">
              <Checkbox
                id="verified-filter"
                checked={currentSearchParams.verifiedOnly || false}
                onCheckedChange={(checked) => handleFilterChange('verifiedOnly', checked ? 'true' : null)}
              />
              <label
                htmlFor="verified-filter"
                className="text-xs sm:text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                <span className="hidden sm:inline">Verified Only</span>
                <span className="sm:hidden">Verified</span>
              </label>
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
        </div>
      </header>

      {isAdmin && (
        <div className="mb-4 flex items-center justify-between bg-secondary/20 p-2 rounded-lg">
          <div className="flex items-center gap-2">
            <Button variant={isSelectionMode ? "default" : "outline"} size="sm" onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              if (isSelectionMode) setSelectedIds(new Set());
            }}>
              {isSelectionMode ? "Cancel Selection" : "Bulk Edit"}
            </Button>
            {isSelectionMode && (
              <div className="flex items-center gap-2 ml-2">
                <Checkbox
                  checked={selectedIds.size === products.length && products.length > 0}
                  onCheckedChange={selectAll}
                />
                <span className="text-sm">Select All Loaded</span>
              </div>
            )}
          </div>
          {isSelectionMode && selectedIds.size > 0 && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <span className="text-sm font-medium mr-2">{selectedIds.size} Selected</span>
              <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">Edit Price</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Update Price</DialogTitle>
                    <DialogDescription>
                      Set a new price for {selectedIds.size} selected items.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      type="number"
                      placeholder="New Price"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleBulkUpdatePrice} disabled={isBulkUpdating}>
                      {isBulkUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Prices
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}

      {renderProducts()}

      {isFetchingNextPage && (
        <div className="flex justify-center mt-8">
          <Loader2 className="animate-spin" />
        </div>
      )}

      {!hasNextPage && products.length > 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>You&apos;ve reached the end of the list.</p>
        </div>
      )}

      {assistantProduct && (
        <PriceAssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          product={assistantProduct}
        />
      )}
    </div>
  );
}

export default InfiniteProductGridInner;
