'use client';

import ProductGridSkeleton from '@/components/products/ProductGridSkeleton';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { getProducts } from '@/services/product-service';
import { searchProductsAction } from '@/app/actions/search/search';
import SaveSearchButton from '@/components/search/SaveSearchButton';
import type { Product, ProductSearchParams, UserProfile } from '@/lib/types';
import { parseFilterSearchParams, activeFilterChips, clearFiltersHref, sortOptionsFor, applyClientSort, DEFAULT_SORT } from '@/lib/filters/params';
import ProductCard from '@/components/products/ProductCard';
import ProductCardSkeleton from '@/components/products/ProductCardSkeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, Loader2, Grid3x3, Rows3, CreditCard, Coins, ShieldCheck, AlertCircle, Footprints, Shirt, Watch, ShoppingBag, Library, X, SlidersHorizontal } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PageHeader } from '../layout/PageHeader';
import AdvancedFilterPanel from '../filters/AdvancedFilterPanel';
import { useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { motion } from 'framer-motion';
import MontageGrid from './MontageGrid';
import Link from 'next/link';
import Image from 'next/image';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { bulkUpdateProductPrice } from '@/app/actions/marketplace/product-updates';
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
import { cn } from "@/lib/utils/ui";
import PriceAssistantModal from '@/components/admin/PriceAssistantModal';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryPills } from './CategoryPills';
import { QuickFilterChips } from './QuickFilterChips';
import { exportAllProductsCSV } from '@/app/actions/admin/export';
import { Download, Search } from 'lucide-react';
import { AdUnit } from '@/components/ads/AdUnit';

type ViewMode = 'grid' | 'list' | 'montage' | 'compact';
const PAGE_SIZE = 24;

function InfiniteProductGridInner({
  pageTitle,
  pageDescription,
  initialFilterState = {},
  isAdmin = false,
  titleAsH1 = false,
  initialData,
  hideTitle = false,
  containerClassName = "container mx-auto max-w-screen-2xl px-4 py-8 min-h-screen",
  searchProvider = 'firestore',
  intro,
}: {
  pageTitle: string,
  pageDescription?: string,
  initialFilterState?: Partial<ProductSearchParams>,
  isAdmin?: boolean,
  titleAsH1?: boolean,
  initialData?: any,
  hideTitle?: boolean,
  containerClassName?: string,
  /** 'typesense' | 'algolia' routes public searches through the search adapter (server action). */
  searchProvider?: string,
  /** Short, crawlable category intro shown under the heading. */
  intro?: string
}) {
  const queryClient = useQueryClient();
  const router = useRouter();

  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { user } = useUser();
  const { userProfile, isAdmin: isUserAdmin, isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();

  // Consolidate the effective role for data fetching
  const userRole = useMemo(() => {
    if (isSuperAdmin) return 'superadmin';
    if (isUserAdmin) return 'admin';
    return userProfile?.role || 'viewer';
  }, [isSuperAdmin, isUserAdmin, userProfile?.role]);

  // Define currentSearchParams BEFORE using it in useInfiniteQuery
  const currentSearchParams = useMemo(
    () => parseFilterSearchParams(new URLSearchParams(searchParams.toString()), initialFilterState),
    [searchParams, initialFilterState]
  );
  // Server-rendered first page only matches an unfiltered URL; filtered deep links fetch fresh.
  const canUseInitialData = useMemo(() => !!initialData && [...searchParams.keys()].every((k) => k === 'view'), [initialData, searchParams]);
  const facetCategoryName = (currentSearchParams.category || initialFilterState.category) as string | undefined;
  const sortOptions = useMemo(() => sortOptionsFor(facetCategoryName), [facetCategoryName]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    isLoading,
    isPending,
    error,
    isError
  } = useInfiniteQuery({
    queryKey: ['products', currentSearchParams, userRole],
    queryFn: ({ pageParam }) => (searchProvider !== 'firestore' && !isAdmin)
      ? searchProductsAction({ ...currentSearchParams, lastId: pageParam as string | undefined, limit: PAGE_SIZE })
      : getProducts({
        ...currentSearchParams,
        lastId: pageParam as string | undefined,
        limit: PAGE_SIZE,
        page: pageParam ? 2 : 1 // Simple hack to indicate not first page if pageParam exists
      }, userRole as string),
    initialPageParam: undefined,
    initialData: canUseInitialData ? { pages: [initialData], pageParams: [undefined] } : undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.lastVisibleId : undefined,
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: true,
    refetchOnMount: !canUseInitialData,
  });

  const products = useMemo(
    () => applyClientSort(data?.pages.flatMap(page => page.products) ?? [], currentSearchParams.sort as string | undefined),
    [data, currentSearchParams.sort]
  );
  const chips = useMemo(() => activeFilterChips(currentSearchParams, initialFilterState), [currentSearchParams, initialFilterState]);
  const clearHref = useMemo(() => clearFiltersHref(pathname, new URLSearchParams(searchParams.toString())), [pathname, searchParams]);
  const countFor = useCallback(async (f: Partial<ProductSearchParams>) => {
    const res = await getProducts({ ...(initialFilterState as ProductSearchParams), ...(f as ProductSearchParams), countOnly: true }, userRole as string);
    return res.totalCount;
  }, [initialFilterState, userRole]);
  const totalCount = data?.pages[0]?.totalCount;

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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

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

  const sortOrder = (currentSearchParams.sort as string) || DEFAULT_SORT;
  const selectedConditions = useMemo(() => currentSearchParams.conditions || [], [currentSearchParams.conditions]);
  const selectedSellers = useMemo(() => currentSearchParams.sellers || [], [currentSearchParams.sellers]);

  const usersQuery = useMemoFirebase(() => {
    if (!user) return null;
    // RESTRICTION: Only admins can list users. Regular users cannot fetch the seller list.
    // If we need this for public filtering, we must create a public 'sellers' collection or aggregation.
    if (!isAdmin && userRole !== 'superadmin' && userRole !== 'admin') return null;

    return query(collection(db, 'users'), where('accountType', '==', 'seller'));
  }, [user?.uid, isAdmin, userRole]);

  const { data: fetchedUsers, error: usersError } = useCollection<UserProfile>(usersQuery);

  // Log permission errors for debugging but don't crash
  useEffect(() => {
    if (usersError) console.warn("Failed to fetch sellers:", usersError.message);
  }, [usersError]);

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

  const handleFilterChange = useCallback((keyOrChanges: string | Record<string, any>, value?: any) => {
    const changes = typeof keyOrChanges === 'string' ? { [keyOrChanges]: value } : keyOrChanges;
    const newQuery = createQueryString({ ...changes, page: null });
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
        queryClient.invalidateQueries({ queryKey: ['products'] });

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

  const itemLabel = useMemo(() => {
    const category = currentSearchParams.category || initialFilterState.category;
    if (category === 'Collector Cards' || category === 'Trading Cards') return 'Cards';
    if (category === 'Sneakers') return 'Kicks';
    return 'Listings';
  }, [currentSearchParams.category, initialFilterState.category]);

  const skeletonAspectRatio = useMemo(() => {
    const category = currentSearchParams.category || initialFilterState.category;
    if (category === 'Sneakers') return 'aspect-square';
    if (category === 'Collector Cards' || category === 'Trading Cards') return 'aspect-[5/7]';
    return 'aspect-square';
  }, [currentSearchParams.category, initialFilterState.category]);

  const renderProducts = () => {
    if (isError) {
      const isIndexError = error instanceof Error && error.message.includes('index');
      return (
        <div className="col-span-full p-4 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 text-sm">
          <AlertCircle className={cn("h-4 w-4 shrink-0", isIndexError ? "text-primary" : "text-destructive")} />
          <div className={cn("leading-relaxed", isIndexError ? "text-primary font-medium" : "text-destructive")}>
            {isIndexError
              ? "The database is currently optimizing its indexes. This may take a few minutes. Please check back shortly."
              : 'We couldn\'t load listings right now. Please try again, or remove a filter.'
            }
          </div>
        </div>
      );
    }


    if ((products.length === 0 && (isLoading || isPending)) || (isClient && products.length === 0 && !data)) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-3 gap-y-4 md:gap-x-6 md:gap-y-8">
          {[...Array(12)].map((_, i) => (
            <ProductCardSkeleton key={i} aspectRatio={skeletonAspectRatio} />
          ))}
        </div>
      );
    }

    if (products.length === 0 && !isLoading) {
      const hasActiveFilters = chips.length > 0;
      
      return (
        <div className="col-span-full flex flex-col items-center justify-center text-center py-20 px-4 bg-muted/10 border-2 border-dashed rounded-2xl">
          <div className="rounded-full bg-muted/50 p-6 mb-6">
            <Search className="h-10 w-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-2xl font-black uppercase tracking-tight mb-2">No listings found</h3>
          <p className="text-muted-foreground text-lg max-w-md mb-8">
            {hasActiveFilters 
              ? "We couldn't find any products matching your selected filters. Try adjusting or removing some filters to see more results."
              : "There are currently no products available in this category."}
          </p>
          {hasActiveFilters && (
            <Button 
                variant="default" 
                size="lg" 
                className="font-bold text-sm uppercase tracking-wider"
                onClick={() => router.push(clearHref, { scroll: false })}
            >
              Clear All Filters
            </Button>
          )}
        </div>
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
                  priority={index < 4}
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
                  priority={index < 4}
                />
              </div>
            );
          })}
        </div>
      );
    }

    // Default grid view
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-x-2.5 gap-y-4 md:gap-x-6 md:gap-y-8 max-w-full overflow-hidden">
        {products.map((product, index) => {
          const isLastElement = index === products.length - 1;

          // Inject Ad every 12 items (index 11, 23, etc)
          const showAd = (index + 1) % 12 === 0;

          return (
            <React.Fragment key={`${product.id}-${index}`}>
              <div
                ref={isLastElement ? lastProductElementRef : null}
              >
                <ProductCard
                  product={product}
                  viewMode={viewMode}
                  isAdmin={isAdmin}
                  selectable={isSelectionMode}
                  selected={selectedIds.has(product.id)}
                  onToggleSelect={() => toggleSelection(product.id)}
                  onOpenPriceAssistant={openPriceAssistant}
                  priority={index < 4}
                />
              </div>
              {showAd && typeof AdUnit !== 'undefined' && (
                <div className="col-span-full py-4">
                  <AdUnit placement="grid_interstitial" className="w-full aspect-[6/1] md:aspect-[8/1] rounded-2xl" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className={containerClassName}>
      <header className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-8">
        {!hideTitle && (
          <div className="w-full sm:w-auto">
            {titleAsH1 ? (
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2 uppercase">{pageTitle}</h1>
            ) : (
              <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-2 uppercase">{pageTitle}</h2>
            )}
            <div className="flex items-center gap-2">
              <div className="h-1 w-12 bg-primary rounded-full" />
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-[0.2em]">
                {totalCount !== undefined ? `${totalCount} Available ${itemLabel}` : pageDescription}
              </p>
            </div>
            {intro && <p className="mt-3 max-w-2xl text-sm text-muted-foreground" data-testid="category-intro">{intro}</p>}
          </div>
        )}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
          {!isAdmin && <SaveSearchButton params={currentSearchParams} />}
          {isClient && typeof Select !== 'undefined' && (
            <Select value={sortOrder} onValueChange={(v) => handleFilterChange('sort', v)}>
              <SelectTrigger aria-label="Sort listings" className="w-[110px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          {isClient && isAdmin && typeof Select !== 'undefined' && (
            <Select value={currentSearchParams.status || 'all'} onValueChange={(v) => handleFilterChange('status', v === 'all' ? null : v)}>
              <SelectTrigger aria-label="Filter by status" className="w-[110px] sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="pending_approval">Pending</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          )}


          <div className="flex items-center rounded-md border bg-card p-0.5 sm:p-1 h-9 sm:h-10">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleViewChange('grid')} title="Grid View"><LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
            <Button variant={viewMode === 'montage' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => handleViewChange('montage')} title="Montage View">
              <Grid3x3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden xs:flex" onClick={() => handleViewChange('list')} title="List View"><List className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
            <Button variant={viewMode === 'compact' ? 'secondary' : 'ghost'} size="icon" className="h-7 w-7 sm:h-8 sm:w-8 hidden sm:flex" onClick={() => handleViewChange('compact')} title="Compact View"><Rows3 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
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

            {isClient && (
              <>
                {/* Desktop View: Inline */}
                <div className="hidden md:block">
                  <AdvancedFilterPanel
                    targetCategory={currentSearchParams.category || initialFilterState.category}
                    currentFilters={currentSearchParams}
                    onFilterChange={(newFilters) => {
                      const newQuery = createQueryString(newFilters);
                      router.push(`${pathname}?${newQuery}`, { scroll: false });
                    }}
                    onClearFilters={() => router.push(clearHref, { scroll: false })}
                    appliedCount={totalCount}
                    countFor={countFor}
                  />
                </div>

                {/* Mobile View: Collapsible Sheet */}
                <div className="md:hidden">
                  <Sheet open={isFilterDrawerOpen} onOpenChange={setIsFilterDrawerOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 h-11 px-3" data-testid="mobile-filters-trigger">
                        <SlidersHorizontal className="h-4 w-4 text-primary" />
                        <span>Filters{chips.length ? ` (${chips.length})` : ''}</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[90vh] p-0 flex flex-col rounded-t-3xl">
                      <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/10">
                        <SheetTitle className="font-black uppercase text-lg">Filters</SheetTitle>
                      </SheetHeader>
                      <div className="flex-1 overflow-y-auto px-6" data-testid="mobile-filter-sheet">
                        <AdvancedFilterPanel
                          inline
                          targetCategory={facetCategoryName}
                          currentFilters={currentSearchParams}
                          appliedCount={totalCount}
                          countFor={countFor}
                          onFilterChange={(newFilters) => {
                            const newQuery = createQueryString(newFilters as any);
                            router.push(`${pathname}?${newQuery}`, { scroll: false });
                            setIsFilterDrawerOpen(false);
                          }}
                          onClearFilters={() => {
                            router.push(clearHref, { scroll: false });
                            setIsFilterDrawerOpen(false);
                          }}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-4 mb-6">
        {typeof CategoryPills !== 'undefined' && <CategoryPills />}
        {isClient && (
          <QuickFilterChips
            currentFilters={currentSearchParams}
            onFilterChange={handleFilterChange}
            targetCategory={currentSearchParams.category || initialFilterState.category}
          />
        )}
      </div>

      {/* Active Filters Display: only what the user chose (no page defaults / status) */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-6" data-testid="active-filters">
          <span className="text-xs font-black uppercase tracking-widest text-muted-foreground mr-2">Active:</span>
          {chips.map((chip) => (
            <Badge key={`${chip.key}-${chip.value ?? ''}`} variant="secondary" className="px-3 py-1.5 gap-1.5 border-primary/30 bg-primary/10 text-primary text-xs sm:text-sm">
              <span className="font-bold tracking-tight">{chip.label}</span>
              <button
                aria-label={`Remove ${chip.label}`}
                onClick={() => {
                  const value = (currentSearchParams as any)[chip.key];
                  if (chip.value !== undefined && Array.isArray(value)) {
                    const next = value.filter((x: string) => String(x) !== chip.value);
                    handleFilterChange(chip.key, next.length ? next : null);
                  } else if (chip.key === 'subCategory' || chip.key === 'brand') {
                    handleFilterChange({ subCategory: null, brand: null });
                  } else {
                    handleFilterChange(chip.key, null);
                  }
                }}
                className="hover:bg-primary/20 hover:text-destructive rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" data-testid="clear-all-filters" onClick={() => router.push(clearHref, { scroll: false })} className="h-9 px-3 text-xs sm:text-sm font-bold uppercase tracking-tight ml-2">
            Clear All
          </Button>
        </div>
      )}

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
              {typeof Dialog !== 'undefined' && (
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
              )}
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
        <div className="py-16 flex flex-col items-center justify-center opacity-70">
          <div className="relative w-[576px] h-[384px] mb-6 max-w-[90vw]">
            <Image
              src="/benched.png"
              alt="You've reached the bench"
              fill
              sizes="(max-width: 768px) 90vw, 576px"
              priority
              className="object-contain"
            />
          </div>
          <p className="text-muted-foreground font-medium text-lg text-center">You&apos;ve reached the end of the list. Time to head back to the court.</p>
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

// useSearchParams needs its own Suspense boundary so static pages using the grid can
// still prerender (and real 404s aren't masked by a route-level loading.tsx).
function InfiniteProductGrid(props: React.ComponentProps<typeof InfiniteProductGridInner>) {
    return (
        <React.Suspense fallback={<ProductGridSkeleton count={12} />}>
            <InfiniteProductGridInner {...props} />
        </React.Suspense>
    );
}

export default InfiniteProductGrid;
