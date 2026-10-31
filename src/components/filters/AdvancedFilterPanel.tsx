'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
} from '@/components/ui/sheet';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Filter, X, SlidersHorizontal } from 'lucide-react';
import type { ProductSearchParams } from '@/lib/types';
import { cn } from "@/lib/utils/ui";
import { useToast } from '@/hooks/use-toast';
import { facetsFor, normalizeSize } from '@/lib/filters/params';

// These are now defaults, but get overridden by Firestore values.
const DEFAULT_CATEGORIES = [
    'Sneakers',
    'Accessories',
    'Collector Cards',
];

const DEFAULT_SIZES = ['4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15'];

const DEFAULT_CONDITIONS = [
    'New with Box',
    'New without Box',
    'New with Defects',
    'Used with Box',
    'Used',
];

const GRADING_COMPANIES = [
    'PSA',
    'BGS',
    'CGC',
    'SGC',
    'Raw',
];

const CARD_MANUFACTURERS = [
    'Panini',
    'Topps',
    'Upper Deck',
    'Bowman',
    'Fleer',
    'Skybox',
    'Donruss',
    'Other',
];

const SNEAKER_BRANDS = [
    'Jordan',
    'Nike',
    'Adidas',
    'Yeezy',
    'New Balance',
    'Asics',
    'Puma',
    'Reebok',
    'Other',
];

const CARD_SUB_CATEGORIES = [
    'Basketball Cards',
    'Sports Cards',
    'Pokémon',
    'Yu-Gi-Oh!',
    'Magic: The Gathering',
    'Jordan',
    'Kobe',
    'Curry',
    'LeBron',
    'Rookies',
    'Rookies',
    'Signed',
    'Other',
];

const DEAL_TIERS = [
    { label: 'Bronze', value: 'bronze', iconUrl: '/badges/bronze.png' }, // Or text colors if no image
    { label: 'Silver', value: 'silver', iconUrl: '/badges/silver.png' },
    { label: 'Gold', value: 'gold', iconUrl: '/badges/gold.png' },
    { label: 'Platinum', value: 'platinum', iconUrl: '/badges/platinum.png' },
];

interface AdvancedFilterPanelProps {
    currentFilters: Partial<ProductSearchParams>;
    onFilterChange: (filters: Partial<ProductSearchParams>) => void;
    onClearFilters: () => void;
    targetCategory?: string;
    /** Render the panel body directly (mobile sheet / sidebar) instead of its own trigger + sheet. */
    inline?: boolean;
    /** Optional live count for the pending (not yet applied) filters. */
    countFor?: (filters: Partial<ProductSearchParams>) => Promise<number | undefined>;
    /** Count for the applied filters (fallback while the pending count loads). */
    appliedCount?: number;
}

export default function AdvancedFilterPanel({
    currentFilters,
    onFilterChange,
    onClearFilters,
    targetCategory,
    inline = false,
    countFor,
    appliedCount,
}: AdvancedFilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { toast } = useToast();
    const { firestore } = useFirebase();

    // Fetch dynamic category/condition configs
    const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
    const { data: marketplaceOptions } = useDoc<any>(optionsRef);

    const displayCategories = marketplaceOptions?.categories || DEFAULT_CATEGORIES;
    const displayConditions = marketplaceOptions?.conditions || DEFAULT_CONDITIONS;
    const displaySizes = DEFAULT_SIZES; // SIZES are static for now

    // Local state for filters
    const [localFilters, setLocalFilters] = useState<Partial<ProductSearchParams>>(currentFilters);
    useEffect(() => { setLocalFilters(currentFilters); }, [currentFilters]);

    // Live "Show N results" for the pending selection (debounced).
    const [pendingCount, setPendingCount] = useState<number | undefined>(appliedCount);
    const [countLoading, setCountLoading] = useState(false);
    useEffect(() => {
        if (!countFor) { setPendingCount(appliedCount); return; }
        let cancelled = false;
        setCountLoading(true);
        const t = setTimeout(async () => {
            try { const n = await countFor(localFilters); if (!cancelled) setPendingCount(n); }
            catch { if (!cancelled) setPendingCount(undefined); }
            finally { if (!cancelled) setCountLoading(false); }
        }, 300);
        return () => { cancelled = true; clearTimeout(t); };
    }, [localFilters, countFor, appliedCount]);

    const handleLocalChange = useCallback((key: string, value: any) => {
        setLocalFilters(prev => ({
            ...prev,
            [key]: value,
        }));
    }, []);

    const handleApplyFilters = () => {
        onFilterChange(localFilters);
        setIsOpen(false);
    };

    const handleClear = () => {
        setLocalFilters({});
        onClearFilters();
        setIsOpen(false);
    };

    const toggleCategory = (category: string) => {
        const currentCategories = (localFilters.categories as string[]) || [];
        const isSelected = currentCategories.includes(category);

        if (!isSelected && currentCategories.length >= 30) {
            toast({
                title: "Maximum Categories Reached",
                description: "Firestore limits search to 30 categories at once.",
                variant: "destructive"
            });
            return;
        }

        const newCategories = isSelected
            ? currentCategories.filter(c => c !== category)
            : [...currentCategories, category];
        handleLocalChange('categories', newCategories.length > 0 ? newCategories : undefined);
    };

    const toggleCondition = (condition: string) => {
        const currentConditions = (localFilters.conditions as string[]) || [];
        const newConditions = currentConditions.includes(condition)
            ? currentConditions.filter(c => c !== condition)
            : [...currentConditions, condition];
        handleLocalChange('conditions', newConditions.length > 0 ? newConditions : undefined);
    };

    const toggleTier = (tierValue: string) => {
        const currentTiers = (localFilters.multiCardTiers as string[]) || [];
        const newTiers = currentTiers.includes(tierValue)
            ? currentTiers.filter(t => t !== tierValue)
            : [...currentTiers, tierValue];
        handleLocalChange('multiCardTiers', newTiers.length > 0 ? newTiers : undefined);
    };

    const toggleSize = (size: string) => {
        const currentSizes = (localFilters.sizes as string[]) || [];
        const isSelected = currentSizes.map(normalizeSize).includes(size);

        if (!isSelected && currentSizes.length >= 10) {
            toast({
                title: "Maximum Sizes Reached",
                description: "Search is limited to 10 sizes at once.",
                variant: "destructive"
            });
            return;
        }

        const newSizes = isSelected
            ? currentSizes.filter(s => normalizeSize(s) !== size)
            : [...currentSizes, size];
        handleLocalChange('sizes', newSizes.length > 0 ? newSizes : undefined);
    };

    const activeFilterCount = Object.keys(currentFilters).filter(
        key => !['view', 'sort', 'page', 'category', 'categories'].includes(key) && currentFilters[key as keyof ProductSearchParams]
    ).length;

    const priceRange = (localFilters.priceRange as [number, number]) || [0, 10000];
    const yearRange = (localFilters.yearRange as [number, number]) || [1900, new Date().getFullYear()];

    const facets = facetsFor(targetCategory || (localFilters.categories as string[] | undefined)?.[0]);
    const isSneakers = facets.size;
    const isCards = facets.cardSubCategory;

    const toggleGradingCompany = (company: string) => {
        const currentCompanies = (localFilters.gradingCompanies as string[]) || [];
        const newCompanies = currentCompanies.includes(company)
            ? currentCompanies.filter(c => c !== company)
            : [...currentCompanies, company];
        handleLocalChange('gradingCompanies', newCompanies.length > 0 ? newCompanies : undefined);
    };

    const panelBody = (
                <div className="py-8 space-y-10">

                    {/* Sub Category - Sneakers */}
                    {isSneakers && (
                        <>
                            <div className="space-y-3">
                                <Label className="text-base font-bold">Brand</Label>
                                <Select
                                    value={localFilters.subCategory as string || 'all'}
                                    onValueChange={(v) => handleLocalChange('subCategory', v === 'all' ? undefined : v)}
                                >
                                    <SelectTrigger className="h-12">
                                        <SelectValue placeholder="All Brands" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Brands</SelectItem>
                                        {SNEAKER_BRANDS.map(b => (
                                            <SelectItem key={b} value={b}>{b}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Sub Category - Cards */}
                    {isCards && (
                        <>
                            <div className="space-y-3">
                                <Label className="text-base font-bold">Card Sub-Category</Label>
                                <div className="flex flex-wrap gap-2">
                                    {CARD_SUB_CATEGORIES.map(sub => {
                                        const isSelected = localFilters.subCategory === sub;
                                        return (
                                            <Badge
                                                key={sub}
                                                variant={isSelected ? "default" : "outline"}
                                                className="cursor-pointer px-3 py-1 text-sm font-semibold"
                                                onClick={() => handleLocalChange('subCategory', isSelected ? undefined : sub)}
                                            >
                                                {sub}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Size Grid (Visual) - Sneakers Only */}
                    {isSneakers && (
                        <>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-base font-bold">Size (US Men)</Label>
                                    {(localFilters.sizes?.length || 0) > 10 && (
                                        <span className="text-xs text-amber-600 font-medium">Max 10 sizes applied</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {displaySizes.map(size => {
                                        const isSelected = (localFilters.sizes as string[] || []).map(normalizeSize).includes(size);
                                        const simpleSize = size;
                                        return (
                                            <button
                                                key={size}
                                                type="button"
                                                aria-pressed={isSelected}
                                                aria-label={`US ${size}`}
                                                onClick={() => toggleSize(size)}
                                                className={cn(
                                                    "h-12 rounded-md border text-sm font-medium transition-all",
                                                    isSelected
                                                        ? "border-black bg-background text-foreground dark:border-white dark:bg-white dark:text-black"
                                                        : "border-gray-200 bg-white text-gray-900 hover:border-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-100"
                                                )}
                                            >
                                                {simpleSize}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <Separator />
                        </>
                    )}

                    {/* Grading - Cards & Coins */}
                    {facets.grading && (
                        <>
                            <div className="space-y-3">
                                <Label className="text-base font-bold">Grading Company</Label>
                                <div className="flex flex-wrap gap-2">
                                    {GRADING_COMPANIES.map(company => {
                                        const isSelected = (localFilters.gradingCompanies as string[] || []).includes(company);
                                        return (
                                            <Badge
                                                key={company}
                                                variant={isSelected ? "default" : "outline"}
                                                className="cursor-pointer px-3 py-1 text-sm font-semibold"
                                                onClick={() => toggleGradingCompany(company)}
                                            >
                                                {company}
                                            </Badge>
                                        );
                                    })}
                                </div>
                            </div>
                            <Separator />

                            {facets.manufacturer && <><div className="space-y-3">
                                <Label className="text-base font-bold">Manufacturer</Label>
                                <Select
                                    value={localFilters.manufacturer as string || 'all'}
                                    onValueChange={(v) => handleLocalChange('manufacturer', v === 'all' ? undefined : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Manufacturers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Manufacturers</SelectItem>
                                        {CARD_MANUFACTURERS.map(m => (
                                            <SelectItem key={m} value={m}>{m}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Separator /></>}
                        </>
                    )}

                    {/* Price Range */}
                    <div className="space-y-4">
                        <Label className="text-base font-semibold">
                            Price Range: ${priceRange[0]} - ${priceRange[1]}
                        </Label>
                        <Slider
                            min={0}
                            max={10000}
                            step={50}
                            value={priceRange}
                            onValueChange={(value) => handleLocalChange('priceRange', value as [number, number])}
                            className="w-full"
                        />
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Min ($)</Label>
                                <Input
                                    type="number"
                                    value={priceRange[0]}
                                    onChange={(e) => handleLocalChange('priceRange', [Number(e.target.value), priceRange[1]])}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">Max ($)</Label>
                                <Input
                                    type="number"
                                    value={priceRange[1]}
                                    onChange={(e) => handleLocalChange('priceRange', [priceRange[0], Number(e.target.value)])}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>



                    <Separator />

                    {/* Conditions (sneaker scale; hidden for cards/coins) */}
                    {facets.sneakerCondition && <><div className="space-y-3">
                        <Label className="text-base font-semibold">Condition</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {displayConditions.map((condition: string) => {
                                const isSelected = (localFilters.conditions as string[] || []).includes(condition);
                                return (
                                    <div key={condition} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`condition-${condition}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleCondition(condition)}
                                        />
                                        <label
                                            htmlFor={`condition-${condition}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {condition}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <Separator /></>}

                    {/* Deal Tiers */}
                    {facets.dealTiers && <><div className="space-y-3">
                        <Label className="text-base font-semibold">Multi-Listing Deals</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {DEAL_TIERS.map((tier) => {
                                const isSelected = (localFilters.multiCardTiers as string[] || []).includes(tier.value);
                                return (
                                    <div key={tier.value} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`tier-${tier.value}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleTier(tier.value)}
                                        />
                                        <label
                                            htmlFor={`tier-${tier.value}`}
                                            className={cn(
                                                "text-sm font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5",
                                                tier.value === 'bronze' && "text-blue-700",
                                                tier.value === 'silver' && "text-slate-500",
                                                tier.value === 'gold' && "text-yellow-600",
                                                tier.value === 'platinum' && "text-indigo-600"
                                            )}
                                        >
                                            {tier.label}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <Separator /></>}

                    {/* Year Range */}
                    {facets.year && <><div className="space-y-4">
                        <Label className="text-base font-semibold">
                            Year Range: {yearRange[0]} - {yearRange[1]}
                        </Label>
                        <Slider
                            min={1900}
                            max={new Date().getFullYear()}
                            step={1}
                            value={yearRange}
                            onValueChange={(value) => handleLocalChange('yearRange', value as [number, number])}
                            className="w-full"
                        />
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">From</Label>
                                <Input
                                    type="number"
                                    value={yearRange[0]}
                                    onChange={(e) => handleLocalChange('yearRange', [Number(e.target.value), yearRange[1]])}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex-1">
                                <Label className="text-xs text-muted-foreground">To</Label>
                                <Input
                                    type="number"
                                    value={yearRange[1]}
                                    onChange={(e) => handleLocalChange('yearRange', [yearRange[0], Number(e.target.value)])}
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator /></>}

                    {/* Seller Rating */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Minimum Seller Rating</Label>
                        <Select
                            value={localFilters.minRating ? String(localFilters.minRating) : 'all-ratings'}
                            onValueChange={(value) => handleLocalChange('minRating', value === 'all-ratings' ? undefined : Number(value))}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Any rating" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all-ratings">Any Rating</SelectItem>
                                <SelectItem value="4.5">4.5 ⭐ & up</SelectItem>
                                <SelectItem value="4.0">4.0 ⭐ & up</SelectItem>
                                <SelectItem value="3.5">3.5 ⭐ & up</SelectItem>
                                <SelectItem value="3.0">3.0 ⭐ & up</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Keyword Search */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">Keyword Search</Label>
                        <Input
                            placeholder="Search in titles and descriptions..."
                            value={localFilters.q as string || ''}
                            onChange={(e) => handleLocalChange('q', e.target.value || undefined)}
                        />
                    </div>
                </div>
    );

    if (inline) {
        return (
            <div className="flex flex-col" data-testid="filter-panel-inline">
                {panelBody}
            <div className="sticky bottom-0 flex flex-col gap-2 bg-background pt-4 pb-2 border-t border-border/10" data-testid="filter-footer">
                    <Button onClick={handleApplyFilters} className="w-full h-12 font-bold" data-testid="filter-apply">
                        {countLoading ? 'Counting…' : pendingCount !== undefined ? `Show ${pendingCount} result${pendingCount === 1 ? '' : 's'}` : 'Apply Filters'}
                    </Button>
                    <Button onClick={handleClear} variant="outline" className="w-full h-11">
                        <X className="mr-2 h-4 w-4" />
                        Clear all
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="relative px-2 sm:px-4">
                    <SlidersHorizontal className="sm:mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFilterCount > 0 && (
                        <Badge className="ml-1 sm:ml-2 px-1.5 min-w-[20px] h-5" variant="default">
                            {activeFilterCount}
                        </Badge>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-l-0" side="right">
                <SheetHeader className="text-left pb-6 border-b border-border/10">
                    <SheetTitle className="text-3xl font-black uppercase tracking-tight">
                        {isSneakers ? 'Sneaker Filters' : isCards ? 'Card Filters' : 'Filters'}
                    </SheetTitle>
                    <SheetDescription className="font-medium text-muted-foreground">
                        {isSneakers ? 'Refine your search for the perfect pair.' : isCards ? 'Find that specific grail for your collection.' : 'Refine your search across the marketplace.'}
                    </SheetDescription>
                </SheetHeader>

                {panelBody}
                <div className="sticky bottom-0 flex flex-col gap-2 bg-background pt-4 pb-2 border-t border-border/10" data-testid="filter-footer">
                    <Button onClick={handleApplyFilters} className="w-full h-12 font-bold" data-testid="filter-apply">
                        {countLoading ? 'Counting…' : pendingCount !== undefined ? `Show ${pendingCount} result${pendingCount === 1 ? '' : 's'}` : 'Apply Filters'}
                    </Button>
                    <Button onClick={handleClear} variant="outline" className="w-full h-11">
                        <X className="mr-2 h-4 w-4" />
                        Clear all
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
