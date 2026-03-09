'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import type { ProductSearchParams } from '@/lib/types';

interface QuickFilterChipsProps {
    currentFilters: Partial<ProductSearchParams>;
    onFilterChange: (key: string, value: any) => void;
    targetCategory?: string;
    className?: string;
}

const QUICK_SIZES = ['US 9', 'US 10', 'US 11', 'US 12'];
const QUICK_BRANDS = ['Jordan', 'Nike', 'Adidas', 'Yeezy'];
const QUICK_PRICES = [
    { label: 'Under $200', value: [0, 200] },
    { label: 'Under $500', value: [0, 500] },
];

export function QuickFilterChips({
    currentFilters,
    onFilterChange,
    targetCategory,
    className
}: QuickFilterChipsProps) {
    const isSneakers = targetCategory === 'Sneakers';
    const currentSizes = (currentFilters.sizes as string[]) || [];
    const currentSubCategory = currentFilters.subCategory as string;
    const currentPriceRange = currentFilters.priceRange as [number, number];

    const toggleSize = (size: string) => {
        const isSelected = currentSizes.includes(size);
        const newSizes = isSelected
            ? currentSizes.filter(s => s !== size)
            : [...currentSizes, size];
        onFilterChange('sizes', newSizes.length > 0 ? newSizes : null);
    };

    const toggleBrand = (brand: string) => {
        const isSelected = currentSubCategory === brand;
        onFilterChange('subCategory', isSelected ? null : brand);
    };

    const togglePrice = (range: [number, number]) => {
        const isSelected = currentPriceRange && currentPriceRange[0] === range[0] && currentPriceRange[1] === range[1];
        onFilterChange('priceRange', isSelected ? null : range);
    };

    return (
        <div className={cn("w-full overflow-x-auto scrollbar-hide py-1", className)}>
            <div className="flex items-center gap-2 px-4 min-w-max">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">Quick Filters:</span>

                {/* Brand Chips (Sneakers Only) */}
                {isSneakers && QUICK_BRANDS.map(brand => {
                    const isSelected = currentSubCategory === brand;
                    return (
                        <button
                            key={brand}
                            onClick={() => toggleBrand(brand)}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap tap-haptic-subtle",
                                isSelected
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:border-muted-foreground/30"
                            )}
                        >
                            {brand}
                        </button>
                    );
                })}

                {/* Size Chips (Sneakers Only) */}
                {isSneakers && QUICK_SIZES.map(size => {
                    const isSelected = currentSizes.includes(size);
                    return (
                        <button
                            key={size}
                            onClick={() => toggleSize(size)}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap tap-haptic-subtle",
                                isSelected
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:border-muted-foreground/30"
                            )}
                        >
                            {size.replace('US ', '')}
                        </button>
                    );
                })}

                {/* Price Chips */}
                {QUICK_PRICES.map(price => {
                    const isSelected = currentPriceRange && currentPriceRange[0] === price.value[0] && currentPriceRange[1] === price.value[1];
                    return (
                        <button
                            key={price.label}
                            onClick={() => togglePrice(price.value as [number, number])}
                            className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap tap-haptic-subtle",
                                isSelected
                                    ? "bg-primary/10 border-primary text-primary"
                                    : "bg-muted/30 border-transparent text-muted-foreground hover:border-muted-foreground/30"
                            )}
                        >
                            {price.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
