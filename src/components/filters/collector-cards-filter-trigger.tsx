
'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Filter, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { UserProfile } from "@/lib/types";
import { Slider } from "../ui/slider";

interface CollectorCardsFilterTriggerProps {
    sortOrder: string;
    setSortOrder: (value: string) => void;
    postcode: string;
    setPostcode: (value: string) => void;
    isExclusionMode: boolean;
    setIsExclusionMode: (value: boolean) => void;
    selectedSellers: string[];
    handleSellerSelection: (sellerId: string) => void;
    availableSellers: UserProfile[];
    priceRange: [number, number];
    setPriceRange: (value: [number, number]) => void;
    conditionOptions: string[];
    selectedConditions: string[];
    handleConditionSelection: (condition: string) => void;
}

export function CollectorCardsFilterTrigger({
    sortOrder,
    setSortOrder,
    postcode,
    setPostcode,
    isExclusionMode,
    setIsExclusionMode,
    selectedSellers,
    handleSellerSelection,
    availableSellers,
    priceRange,
    setPriceRange,
    conditionOptions,
    selectedConditions,
    handleConditionSelection,
}: CollectorCardsFilterTriggerProps) {
    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-10 gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>Filter & Sort</SheetTitle>
                    <SheetDescription>
                        Narrow down your search results.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] pr-4 mt-4">
                    <div className="space-y-8">
                        {/* Sort Order */}
                        <div className="space-y-2">
                            <Label className="font-semibold">Sort By</Label>
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">Newest</SelectItem>
                                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Price Range */}
                        <div className="space-y-4">
                            <Label className="font-semibold">Price Range</Label>
                            <Slider
                                min={0}
                                max={5000}
                                step={10}
                                value={priceRange}
                                onValueChange={(value) => setPriceRange(value as [number, number])}
                            />
                            <div className="flex justify-between text-sm text-muted-foreground">
                                <span>${priceRange[0]}</span>
                                <span>${priceRange[1]}{priceRange[1] === 5000 ? '+' : ''}</span>
                            </div>
                        </div>

                        {/* Condition */}
                        <div className="space-y-2">
                             <Label className="font-semibold">Condition</Label>
                             <div className="space-y-2 border rounded-md p-4 bg-muted/20">
                                {conditionOptions.map(condition => (
                                    <div key={condition} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`condition-${condition}`}
                                            checked={selectedConditions.includes(condition)}
                                            onCheckedChange={() => handleConditionSelection(condition)}
                                        />
                                        <Label htmlFor={`condition-${condition}`} className="text-sm font-normal">
                                            {condition}
                                        </Label>
                                    </div>
                                ))}
                             </div>
                        </div>


                        {/* Postcode */}
                        <div className="space-y-2">
                            <Label className="font-semibold">Seller Postcode</Label>
                            <Input
                                placeholder="e.g. 6000"
                                value={postcode}
                                onChange={(e) => setPostcode(e.target.value)}
                            />
                        </div>

                        {/* Seller Filters */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold">Sellers</Label>
                                <div className="flex items-center space-x-2">
                                    <Label htmlFor="exclusion-mode" className="text-xs text-muted-foreground">
                                        Exclusion Mode
                                    </Label>
                                    <Checkbox
                                        id="exclusion-mode"
                                        checked={isExclusionMode}
                                        onCheckedChange={(checked) => setIsExclusionMode(checked as boolean)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 border rounded-md p-4 bg-muted/20 max-h-48 overflow-y-auto">
                                {availableSellers.length > 0 ? (
                                    availableSellers.map((seller) => (
                                        <div key={seller.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`seller-${seller.id}`}
                                                checked={selectedSellers.includes(seller.id)}
                                                onCheckedChange={() => handleSellerSelection(seller.id)}
                                            />
                                            <Label htmlFor={`seller-${seller.id}`} className="text-sm font-normal">
                                                {seller.displayName}
                                            </Label>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">No active sellers found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
