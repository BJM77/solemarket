
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, X, RotateCcw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

interface WantedFilterPanelProps {
    currentFilters: {
        category?: string;
        maxPrice?: number;
        condition?: string;
    };
    onFilterChange: (filters: { category?: string; maxPrice?: number; condition?: string }) => void;
    onClearFilters: () => void;
}

const CONDITION_OPTIONS = [
    { value: 'any', label: 'Any' },
    { value: 'mint', label: 'Mint' },
    { value: 'near-mint', label: 'Near Mint' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
];

const CATEGORY_OPTIONS = [
    { value: 'all', label: 'All Categories' },
    { value: 'sneakers', label: 'Sneakers' },
    { value: 'cards', label: 'Collector Cards' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'other', label: 'Other' },
];

export default function WantedFilterPanel({
    currentFilters,
    onFilterChange,
    onClearFilters,
}: WantedFilterPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [localFilters, setLocalFilters] = useState(currentFilters);

    useEffect(() => {
        setLocalFilters(currentFilters);
    }, [currentFilters]);

    const handleApply = () => {
        onFilterChange(localFilters);
        setIsOpen(false);
    };

    const handleClear = () => {
        onClearFilters();
        setLocalFilters({});
        setIsOpen(false);
    };

    const activeFilterCount = Object.values(currentFilters).filter(v => v !== undefined && v !== 'all' && v !== 'any').length;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" className="relative gap-2 border-2 hover:bg-muted font-bold h-11 px-6">
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-black text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black dark:bg-white dark:text-black border-2 border-white dark:border-black">
                            {activeFilterCount}
                        </span>
                    )}
                </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto border-l-0" side="right">
                <SheetHeader className="text-left pb-6 border-b border-border/10">
                    <SheetTitle className="text-3xl font-black uppercase tracking-tight">Wanted Filters</SheetTitle>
                    <SheetDescription className="font-medium text-muted-foreground">
                        Find specific items that users are looking to buy.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="h-[calc(100vh-200px)] py-6 pr-4">
                    <div className="space-y-8 pb-10">
                        {/* Category */}
                        <div className="space-y-3">
                            <Label className="text-base font-bold uppercase tracking-wider text-muted-foreground/50">Category</Label>
                            <Select
                                value={localFilters.category || 'all'}
                                onValueChange={(v) => setLocalFilters({ ...localFilters, category: v === 'all' ? undefined : v })}
                            >
                                <SelectTrigger className="h-12 border-2 font-bold focus:ring-0 focus:ring-offset-0">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CATEGORY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value} className="font-semibold">
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator className="bg-border/10" />

                        {/* Max Price */}
                        <div className="space-y-5">
                            <div className="flex justify-between items-center">
                                <Label className="text-base font-bold uppercase tracking-wider text-muted-foreground/50">Budget Limit</Label>
                                <span className="text-xl font-black">${localFilters.maxPrice || 5000}+</span>
                            </div>
                            <Slider
                                min={0}
                                max={5000}
                                step={50}
                                value={[localFilters.maxPrice || 5000]}
                                onValueChange={(vals) => setLocalFilters({ ...localFilters, maxPrice: vals[0] })}
                                className="py-2"
                            />
                            <div className="flex justify-between text-[11px] font-black uppercase text-muted-foreground tracking-widest">
                                <span>$0</span>
                                <span>$5000+</span>
                            </div>
                        </div>

                        <Separator className="bg-border/10" />

                        {/* Desired Condition */}
                        <div className="space-y-4">
                            <Label className="text-base font-bold uppercase tracking-wider text-muted-foreground/50">Desired Condition</Label>
                            <div className="flex flex-wrap gap-2">
                                {CONDITION_OPTIONS.map(opt => {
                                    const isSelected = localFilters.condition === opt.value;
                                    return (
                                        <Badge
                                            key={opt.value}
                                            variant={isSelected ? "default" : "outline"}
                                            className={`cursor-pointer px-4 py-2 text-sm font-black border-2 transition-all ${isSelected
                                                    ? 'bg-black text-white border-black hover:bg-black/90 dark:bg-white dark:text-black dark:border-white'
                                                    : 'hover:border-black dark:hover:border-white'
                                                }`}
                                            onClick={() => setLocalFilters({ ...localFilters, condition: opt.value })}
                                        >
                                            {opt.label}
                                        </Badge>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-md border-t border-border/10 flex gap-4">
                    <Button
                        variant="outline"
                        className="flex-1 h-12 border-2 font-black uppercase tracking-widest gap-2"
                        onClick={handleClear}
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </Button>
                    <Button
                        className="flex-[2] h-12 font-black uppercase tracking-widest bg-black text-white dark:bg-white dark:text-black hover:opacity-90"
                        onClick={handleApply}
                    >
                        Apply Filters
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

