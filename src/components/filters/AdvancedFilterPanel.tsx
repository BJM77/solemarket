'use client';

import { useState, useCallback } from 'react';
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
import { cn } from '@/lib/utils';

// These are now defaults, but get overridden by Firestore values.
const DEFAULT_CATEGORIES = [
    'Sneakers',
    'Accessories',
    'Trading Cards',
];

const DEFAULT_SIZES = [
    'US 4', 'US 4.5', 'US 5', 'US 5.5', 'US 6', 'US 6.5', 'US 7', 'US 7.5', 'US 8', 'US 8.5',
    'US 9', 'US 9.5', 'US 10', 'US 10.5', 'US 11', 'US 11.5', 'US 12', 'US 12.5', 'US 13', 'US 14', 'US 15'
];

const DEFAULT_CONDITIONS = [
    'New with Box',
    'New without Box',
    'New with Defects',
    'Used with Box',
    'Used',
];

const SORT_OPTIONS = [
    { value: 'createdAt-desc', label: 'Newest First' },
    { value: 'createdAt-asc', label: 'Oldest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'views-desc', label: 'Most Popular' },
    { value: 'title-asc', label: 'Title: A to Z' },
];

interface AdvancedFilterPanelProps {
    currentFilters: Partial<ProductSearchParams>;
    onFilterChange: (filters: Partial<ProductSearchParams>) => void;
    onClearFilters: () => void;
}

export default function AdvancedFilterPanel({
    currentFilters,
    onFilterChange,
    onClearFilters,
}: AdvancedFilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { firestore } = useFirebase();

    // Fetch dynamic category/condition configs
    const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
    const { data: marketplaceOptions } = useDoc<any>(optionsRef);

    const displayCategories = marketplaceOptions?.categories || DEFAULT_CATEGORIES;
    const displayConditions = marketplaceOptions?.conditions || DEFAULT_CONDITIONS;
    const displaySizes = DEFAULT_SIZES; // SIZES are static for now

    // Local state for filters
    const [localFilters, setLocalFilters] = useState<Partial<ProductSearchParams>>(currentFilters);

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
    };

    const toggleCategory = (category: string) => {
        const currentCategories = (localFilters.categories as string[]) || [];
        const newCategories = currentCategories.includes(category)
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

    const toggleSize = (size: string) => {
        const currentSizes = (localFilters.sizes as string[]) || [];
        const newSizes = currentSizes.includes(size)
            ? currentSizes.filter(s => s !== size)
            : [...currentSizes, size];
        handleLocalChange('sizes', newSizes.length > 0 ? newSizes : undefined);
    };

    const activeFilterCount = Object.keys(currentFilters).filter(
        key => !['view', 'sort', 'page'].includes(key) && currentFilters[key as keyof ProductSearchParams]
    ).length;

    const priceRange = (localFilters.priceRange as [number, number]) || [0, 10000];
    const yearRange = (localFilters.yearRange as [number, number]) || [1900, new Date().getFullYear()];

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
                    <SheetTitle className="text-3xl font-black uppercase tracking-tight">Filters</SheetTitle>
                    <SheetDescription className="font-medium text-muted-foreground">
                        Refine your search for the perfect pair.
                    </SheetDescription>
                </SheetHeader>

                <div className="py-8 space-y-10">
                    {/* Sort */}
                    <div className="space-y-3">
                        <Label className="text-base font-bold">Sort By</Label>
                        <Select
                            value={localFilters.sort as string || 'createdAt-desc'}
                            onValueChange={(value) => handleLocalChange('sort', value)}
                        >
                            <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select sort order" />
                            </SelectTrigger>
                            <SelectContent>
                                {SORT_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Separator />

                    {/* Size Grid (Visual) */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-bold">Size (US Men)</Label>
                            {(localFilters.sizes?.length || 0) > 10 && (
                                <span className="text-xs text-amber-600 font-medium">Max 10 sizes applied</span>
                            )}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                            {displaySizes.map(size => {
                                const isSelected = (localFilters.sizes as string[] || []).includes(size);
                                const simpleSize = size.replace('US ', '');
                                return (
                                    <button
                                        key={size}
                                        onClick={() => toggleSize(size)}
                                        className={cn(
                                            "h-12 rounded-md border text-sm font-medium transition-all",
                                            isSelected
                                                ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black"
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

                    {/* Categories */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-base font-semibold">Categories</Label>
                            {(localFilters.categories?.length || 0) > 30 && (
                                <span className="text-xs text-amber-600 font-medium">Max 30 applied</span>
                            )}
                        </div>
                        <div className="space-y-2">
                            {displayCategories.map((category: string) => {
                                const isSelected = (localFilters.categories as string[] || []).includes(category);
                                return (
                                    <div key={category} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`category-${category}`}
                                            checked={isSelected}
                                            onCheckedChange={() => toggleCategory(category)}
                                        />
                                        <label
                                            htmlFor={`category-${category}`}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            {category}
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <Separator />

                    {/* Conditions */}
                    <div className="space-y-3">
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

                    <Separator />

                    {/* Year Range */}
                    <div className="space-y-4">
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

                    <Separator />

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

                <SheetFooter className="flex-col sm:flex-col gap-2 sticky bottom-0 bg-background pt-4">
                    <Button onClick={handleApplyFilters} className="w-full">
                        Apply Filters
                    </Button>
                    <Button onClick={handleClear} variant="outline" className="w-full">
                        <X className="mr-2 h-4 w-4" />
                        Clear All Filters
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
