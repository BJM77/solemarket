'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getProducts } from '@/services/product-service';
import type { Product, ProductSearchParams, UserProfile } from '@/lib/types';
import ProductCard from '@/components/products/ProductCard';
import ProductCardSkeleton from '@/components/products/ProductCardSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LayoutGrid, List, Loader2, Grid, Rows, CreditCard, Coins, ShieldCheck, AlertCircle } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import AdvancedFilterPanel from '../filters/AdvancedFilterPanel';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { motion } from 'framer-motion';
import MontageGrid from './MontageGrid';
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
import { cn } from '@/lib/utils';
import PriceAssistantModal from '@/components/admin/PriceAssistantModal';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryPills } from './CategoryPills';
import { exportAllProductsCSV } from '@/app/actions/export';
import { Download } from 'lucide-react';

type ViewMode = 'grid' | 'list' | 'montage' | 'compact';
const PAGE_SIZE = 24;

function InfiniteProductGridInner({
  pageTitle,
  pageDescription,
  initialFilterState = {},
  isAdmin = false,
  initialData
}: {
  pageTitle: string,
  pageDescription?: string,
  initialFilterState?: Partial<ProductSearchParams>,
  isAdmin?: boolean,
  initialData?: any
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { user } = useUser();
  const { userProfile } = useUserPermissions();
  const userRole = userProfile?.role;

  // Define currentSearchParams BEFORE using it in useInfiniteQuery
  const currentSearchParams = useMemo(() => {
    const params: ProductSearchParams = { ...initialFilterState };
    searchParams.forEach((value, key) => {
      if (key === 'priceRange' || key === 'yearRange') {
        try {
          params[key] = value.split(',').map(Number) as [number, number];
        } catch {
          // Ignore invalid formats
        }
      } else if (key === 'conditions' || key === 'sellers' || key === 'categories') {
        params[key] = value.split(',');
      } else if (key === 'verifiedOnly') {
        params[key] = value === 'true';
      } else if (value) {
        params[key] = value;
      }
    });
    return params;
  }, [searchParams, initialFilterState]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    error,
    isError
  } = useInfiniteQuery({
    queryKey: ['products', currentSearchParams, userRole],
    queryFn: ({ pageParam }) => getProducts({
      ...currentSearchParams,
      lastId: pageParam as string | undefined,
      limit: PAGE_SIZE
    }, userRole as string),
    initialPageParam: undefined,
    initialData: initialData ? { pages: [initialData], pageParams: [undefined] } : undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastVisibleId : undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: true,
    refetchOnMount: !initialData,
  });

  const products = useMemo(() => data?.pages.flatMap(page => page.products) ?? [], [data]);

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) throw new Error("Auth required");

      const result = await exportAllProductsCSV(idToken);
      if (result.error) throw new Error(result.error);

      if (result.csv) {
        const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Product data has been downloaded." });
      }
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Price Assistant State
  const [assistantProduct, setAssistantProduct] = useState<{ id: string, title: string, price: number } | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Use a ref for the observer to avoid recreating it
  const observerRef = useRef<IntersectionObserver | null>(null);
  const observerElementRef = useRef<HTMLDivElement | null>(null);

  // Filter specific states, derived from URL
  const [viewMode, setViewMode] = useState<ViewMode>((currentSearchParams.view as ViewMode) || 'grid');

  useEffect(() => {
    if (currentSearchParams.view) {
      setViewMode(currentSearchParams.view as ViewMode);
    } else if (typeof window !== 'undefined' && window.innerWidth < 640) {
      setViewMode('montage');
    }
  }, [currentSearchParams.view]);



  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  // Setup intersection observer
  const setupObserver = useCallback((node: HTMLDivElement) => {
    // Cleanup previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // Don't setup if loading or no more pages
    if (isLoading || isFetchingNextPage || !hasNextPage || !node) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observerRef.current.observe(node);
    observerElementRef.current = node;
  }, [fetchNextPage, hasNextPage, isLoading, isFetchingNextPage]);

  // Re-setup observer when dependencies change
  useEffect(() => {
    if (observerElementRef.current) {
      const node = observerElementRef.current;
      observerRef.current?.disconnect();
      setupObserver(node);
    }
  }, [setupObserver]);

  const lastProductElementRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      setupObserver(node);
    } else if (observerRef.current && observerElementRef.current === node) {
      observerRef.current.disconnect();
      observerRef.current = null;
      observerElementRef.current = null;
    }
  }, [setupObserver]);

  const sortOrder = currentSearchParams.sort || 'createdAt-desc';
  const selectedConditions = useMemo(() => currentSearchParams.conditions || [], [currentSearchParams.conditions]);
  const selectedSellers = useMemo(() => currentSearchParams.sellers || [], [currentSearchParams.sellers]);

  const usersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, 'users'), where('accountType', '==', 'seller'));
  }, [user?.uid]);

  const { data: fetchedUsers } = useCollection<UserProfile>(usersQuery);
  const availableSellers = useMemo(() => fetchedUsers || [], [fetchedUsers]);

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
        // Instead of reloading, you could invalidate the query cache
        // queryClient.invalidateQueries({ queryKey: ['products'] });
        window.location.reload();
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
    if (isError) {
      return (
        <Alert variant="destructive" className="col-span-full">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load products. {error instanceof Error ? error.message : 'Unknown error'}
          </AlertDescription>
        </Alert>
      );
    }

    if (products.length === 0 && isLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-8">
          {[...Array(12)].map((_, i) => (
            <ProductCardSkeleton key={i} aspectRatio={skeletonAspectRatio} />
          ))}
        </div>
      );
    }

    if (products.length === 0 && !isLoading) {
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
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                ref={isLastElement ? lastProductElementRef : null}
                key={`${product.id}-${index}`}
              >
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
            );
          })}
        </div>
      );
    }

    if (viewMode === 'montage') {
      return (
        <MontageGrid
          products={products}
          lastProductRef={lastProductElementRef}
          isAdmin={isAdmin}
          onOpenPriceAssistant={openPriceAssistant}
        />
      );
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

    // Default grid view
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-8">
        {products.map((product, index) => {
          const isLastElement = index === products.length - 1;
          return (
            <div
              ref={isLastElement ? lastProductElementRef : null}
              key={`${product.id}-${index}`}
            >
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
          );
        })}
      </div>
    );
  };

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

          <div className="hidden sm:flex items-center gap-0.5 sm:gap-1 bg-card border rounded-md p-0.5 sm:p-1 h-9 sm:h-10">
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

      <div className="mb-6">
        <CategoryPills />
      </div>

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

      {/* Products grid */}
      {renderProducts()}

      {/* Loading indicator */}
      {isFetchingNextPage && hasNextPage && (
        <div className="flex justify-center mt-8">
          <Loader2 className="animate-spin h-8 w-8" />
          <span className="ml-2 text-sm text-muted-foreground">Loading more...</span>
        </div>
      )}

      {/* Fallback load more button */}
      {!isFetchingNextPage && hasNextPage && products.length > 0 && (
        <div className="flex justify-center mt-8">
          <Button variant="outline" onClick={() => fetchNextPage()}>
            Load More
          </Button>
        </div>
      )}

      {/* End of list message */}
      {!hasNextPage && products.length > 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>You&apos;ve reached the end of the list.</p>
        </div>
      )}

      {/* Price Assistant Modal */}
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
