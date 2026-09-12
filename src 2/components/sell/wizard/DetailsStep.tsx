'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandRequestModal } from '../BrandRequestModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles, Plus } from 'lucide-react';
import { isCardCategory, isCoinCategory, normalizeCategory } from '@/lib/constants/marketplace';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { addSubCategory } from '@/app/actions/admin/admin-categories';
import { useFirebase, useUser } from '@/firebase';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface DetailsStepProps {
    form: any;
    selectedType: 'sneakers' | 'collector-cards' | 'coins';
    subCategories: Record<string, string[]>;
    conditionOptions: string[];
    onAutoFill?: () => Promise<void>;
    isAnalyzing?: boolean;
    analysisStage?: string;
    suggestedFields?: string[];
    onFieldChange?: (field: string) => void;
    imageFiles?: any[];
    analyzingFields?: Record<string, boolean>;
}

export function DetailsStep({ 
    form, 
    selectedType, 
    subCategories, 
    conditionOptions, 
    onAutoFill, 
    isAnalyzing, 
    analysisStage,
    suggestedFields = [],
    onFieldChange,
    imageFiles = [],
    analyzingFields = {}
}: DetailsStepProps) {
    const { isSuperAdmin } = useUserPermissions();
    const { user } = useUser();
    const { toast } = useToast();
    const [isAddingSub, setIsAddingSub] = useState(false);
    const [newSubName, setNewSubName] = useState('');
    const [isSavingSub, setIsSavingSub] = useState(false);

    const rawCategory = form.watch('category') || (selectedType === 'sneakers' ? 'Sneakers' : selectedType === 'coins' ? 'Coins' : 'Collector Cards');
    const category = normalizeCategory(rawCategory);
    const isTradingCard = isCardCategory(category) || isCoinCategory(category);

    const handleAddNewSub = async () => {
        if (!newSubName.trim() || !user) return;
        setIsSavingSub(true);
        try {
            const idToken = await user.getIdToken();
            const result = await addSubCategory(category, newSubName.trim(), idToken);
            if (result.success) {
                toast({ title: "Sub-category added!" });
                form.setValue('subCategory', newSubName.trim());
                setIsAddingSub(false);
                setNewSubName('');
            }
        } catch (err: any) {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        } finally {
            setIsSavingSub(false);
        }
    };

    const AISuggestionBadge = ({ fieldName }: { fieldName: string }) => {
        if (!suggestedFields.includes(fieldName)) return null;
        return (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary animate-in fade-in zoom-in duration-300">
                <Sparkles className="h-2.5 w-2.5" />
                <span>AI SUGGESTED</span>
            </div>
        );
    };

    const AIAnalyzingIndicator = ({ fieldName }: { fieldName: string }) => {
        if (!analyzingFields[fieldName]) return null;
        return (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400 animate-pulse duration-1000">
                <Loader2 className="h-2.5 w-2.5 animate-spin mr-0.5 text-indigo-400" />
                <span>AI ANALYZING...</span>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="pt-2 border-t border-white/10 my-4" />

            <Card className="border-0 shadow-md bg-card">
                <CardHeader><CardTitle>Core Information</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="title" render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                                    <div className="flex items-center gap-2">
                                        <AIAnalyzingIndicator fieldName="title" />
                                        <AISuggestionBadge fieldName="title" />
                                    </div>
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder={isCoinCategory(category) ? "e.g. 1930 Australian Penny" : isTradingCard ? "e.g. 2023 Panini Prizm Victor Wembanyama Rookie" : "e.g. Air Jordan 1 High OG Chicago"} 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('title');
                                        }}
                                        className={cn(
                                            suggestedFields.includes('title') && "bg-primary/5 border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.05)]",
                                            analyzingFields['title'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* Sub Category Selection */}
                        <FormField control={form.control} name="subCategory" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Sub-Category</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <AIAnalyzingIndicator fieldName="subCategory" />
                                        <AISuggestionBadge fieldName="subCategory" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Select 
                                        onValueChange={(val) => {
                                            onFieldChange?.('subCategory');
                                            if (val === 'ADD_NEW') {
                                                setIsAddingSub(true);
                                            } else {
                                                field.onChange(val);
                                            }
                                        }} 
                                        value={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger className={cn(
                                                suggestedFields.includes('subCategory') && "bg-primary/5 border-primary/30",
                                                analyzingFields['subCategory'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 text-indigo-400"
                                            )}>
                                                <SelectValue placeholder="Select sub-category" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(subCategories[category] || []).map((s: string) => (
                                                <SelectItem key={s} value={s}>{s}</SelectItem>
                                            ))}
                                            {isSuperAdmin && (
                                                <SelectItem value="ADD_NEW" className="text-primary font-bold">
                                                    <div className="flex items-center gap-2">
                                                        <Plus className="h-4 w-4" /> Add New Sub-Category...
                                                    </div>
                                                </SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    
                                    {isAddingSub && (
                                        <div className="flex items-center gap-2 mt-2 animate-in fade-in slide-in-from-top-2">
                                            <Input 
                                                placeholder="New sub-category name" 
                                                value={newSubName} 
                                                onChange={(e) => setNewSubName(e.target.value)}
                                                className="h-9"
                                            />
                                            <Button size="sm" onClick={handleAddNewSub} disabled={isSavingSub}>
                                                {isSavingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setIsAddingSub(false)}>Cancel</Button>
                                        </div>
                                    )}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="allowLocalPickup" render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/10 p-4 shadow-sm bg-white/5 md:col-span-2">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-sm font-bold text-white">Enable Buy & Collect</FormLabel>
                                    <FormDescription className="text-[10px]">Allow buyers to see your number and arrange local cash pickup.</FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="condition" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Condition <span className="text-red-500">*</span></FormLabel>
                                    <div className="flex items-center gap-2">
                                        <AIAnalyzingIndicator fieldName="condition" />
                                        <AISuggestionBadge fieldName="condition" />
                                    </div>
                                </div>
                                <Select 
                                    onValueChange={(val) => {
                                        onFieldChange?.('condition');
                                        field.onChange(val);
                                    }} 
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className={cn(
                                            suggestedFields.includes('condition') && "bg-primary/5 border-primary/30",
                                            analyzingFields['condition'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 text-indigo-400"
                                        )}>
                                            <SelectValue placeholder="Select condition" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {conditionOptions.map((c: string) => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    {!isTradingCard && (
                        <FormField control={form.control} name="brand" render={({ field }) => (
                            <FormItem className="space-y-4">
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel className="text-base font-bold">Brand <span className="text-red-500">*</span></FormLabel>
                                    <div className="flex items-center gap-2">
                                        <AIAnalyzingIndicator fieldName="brand" />
                                        <BrandRequestModal />
                                    </div>
                                </div>
                                <div className={cn(
                                    "grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 rounded-xl transition-all duration-300",
                                    analyzingFields['brand'] && "animate-pulse bg-indigo-500/5 border border-dashed border-indigo-500/30"
                                )}>
                                    {['Jordan', 'Nike', 'Adidas', 'Yeezy', 'New Balance', 'Puma', 'Reebok', 'Under Armour', 'Converse', 'ANTA'].map((brand) => (
                                        <Button
                                            key={brand}
                                            type="button"
                                            variant={field.value === brand ? 'default' : 'outline'}
                                            className={cn(
                                                "h-12 font-bold uppercase tracking-tight rounded-xl transition-all",
                                                field.value === brand ? "bg-primary shadow-md scale-[1.02]" : "hover:border-primary/50"
                                            )}
                                            onClick={() => {
                                                field.onChange(brand);
                                                form.setValue('hasOtherBrand', false);
                                                onFieldChange?.('brand');
                                            }}
                                        >
                                            {brand}
                                        </Button>
                                    ))}
                                    <Button
                                        type="button"
                                        variant={form.watch('hasOtherBrand') ? 'default' : 'outline'}
                                        className={cn(
                                            "h-12 font-bold uppercase tracking-tight rounded-xl transition-all",
                                            form.watch('hasOtherBrand') ? "bg-primary shadow-md scale-[1.02]" : "hover:border-primary/50"
                                        )}
                                        onClick={() => {
                                            form.setValue('hasOtherBrand', true);
                                            field.onChange('');
                                            onFieldChange?.('brand');
                                        }}
                                    >
                                        Other
                                    </Button>
                                </div>
                                {form.watch('hasOtherBrand') && (
                                    <FormControl>
                                        <Input
                                            placeholder="Enter brand name..."
                                            className="h-12 rounded-xl mt-2 animate-in fade-in slide-in-from-top-2"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                onFieldChange?.('brand');
                                            }}
                                            autoFocus
                                        />
                                    </FormControl>
                                )}
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}

                    {isTradingCard && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="brand" render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between h-5">
                                        <FormLabel>Manufacturer / Set <span className="text-red-500">*</span></FormLabel>
                                        <div className="flex items-center gap-2">
                                            <AIAnalyzingIndicator fieldName="brand" />
                                            <AISuggestionBadge fieldName="brand" />
                                        </div>
                                    </div>
                                    <FormControl>
                                        <Input 
                                            placeholder={isCoinCategory(category) ? "e.g. Perth Mint" : "e.g. Panini Prizm"} 
                                            {...field} 
                                            onChange={(e) => {
                                                field.onChange(e);
                                                onFieldChange?.('brand');
                                            }}
                                            className={cn(
                                                suggestedFields.includes('brand') && "bg-primary/5 border-primary/30",
                                                analyzingFields['brand'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between h-5">
                                        <FormLabel>Year </FormLabel>
                                        <AIAnalyzingIndicator fieldName="year" />
                                    </div>
                                    <FormControl>
                                        <Input 
                                            type="number" 
                                            placeholder="2023" 
                                            {...field} 
                                            onChange={(e) => {
                                                field.onChange(e);
                                                onFieldChange?.('year');
                                            }}
                                            className={cn(
                                                analyzingFields['year'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                            )}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}

                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl><Textarea rows={4} placeholder="Describe any flaws, history, or unique features..." {...field} /></FormControl>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>

            {isTradingCard ? (
                <Card className="border-0 shadow-md bg-card">
                    <CardHeader><CardTitle>{isCoinCategory(category) ? 'Coin & Banknote Specs' : 'Trading Card Specs'}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="gradingCompany" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Grading Company</FormLabel>
                                    <AIAnalyzingIndicator fieldName="gradingCompany" />
                                </div>
                                <Select 
                                    onValueChange={(val) => {
                                        field.onChange(val);
                                        onFieldChange?.('gradingCompany');
                                    }} 
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className={cn(
                                            analyzingFields['gradingCompany'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 text-indigo-400"
                                        )}>
                                            <SelectValue placeholder={isCoinCategory(category) ? "PCGS, NGC, ANACS..." : "PSA, BGS, SGC..."} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(isCoinCategory(category) ? ['Raw', 'PCGS', 'NGC', 'ANACS', 'ICG', 'Other'] : ['Raw', 'PSA', 'BGS', 'SGC', 'CGC', 'HGA', 'Other']).map((co) => (
                                            <SelectItem key={co} value={co}>{co}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="grade" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Grade</FormLabel>
                                    <AIAnalyzingIndicator fieldName="grade" />
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder="e.g. 10, 9.5" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('grade');
                                        }}
                                        className={cn(
                                            analyzingFields['grade'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="certNumber" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Certification #</FormLabel>
                                    <AIAnalyzingIndicator fieldName="certNumber" />
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder={isCoinCategory(category) ? "PCGS/NGC Cert #" : "PSA Cert #"} 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('certNumber');
                                        }}
                                        className={cn(
                                            analyzingFields['certNumber'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="cardNumber" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Card Number</FormLabel>
                                    <AIAnalyzingIndicator fieldName="cardNumber" />
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder="e.g. #123" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('cardNumber');
                                        }}
                                        className={cn(
                                            analyzingFields['cardNumber'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-md bg-card">
                    <CardHeader><CardTitle>{selectedType === 'sneakers' ? 'Sneaker Specs' : 'Item Specs'}</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="size" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Size (US)</FormLabel>
                                    <AIAnalyzingIndicator fieldName="size" />
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder="e.g. 10.5" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('size');
                                        }}
                                        className={cn(
                                            analyzingFields['size'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="styleCode" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Style Code</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <AIAnalyzingIndicator fieldName="styleCode" />
                                        <AISuggestionBadge fieldName="styleCode" />
                                    </div>
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder="e.g. DZ5485-612" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('styleCode');
                                        }}
                                        className={cn(
                                            suggestedFields.includes('styleCode') && "bg-primary/5 border-primary/30",
                                            analyzingFields['styleCode'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="colorway" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Colorway</FormLabel>
                                    <AIAnalyzingIndicator fieldName="colorway" />
                                </div>
                                <FormControl>
                                    <Input 
                                        placeholder="e.g. Varsity Red/Black/Sail" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('colorway');
                                        }}
                                        className={cn(
                                            analyzingFields['colorway'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="year" render={({ field }) => (
                            <FormItem>
                                <div className="flex items-center justify-between h-5">
                                    <FormLabel>Release Year</FormLabel>
                                    <AIAnalyzingIndicator fieldName="year" />
                                </div>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        placeholder="2015" 
                                        {...field} 
                                        onChange={(e) => {
                                            field.onChange(e);
                                            onFieldChange?.('year');
                                        }}
                                        className={cn(
                                            analyzingFields['year'] && "animate-pulse border-indigo-500/30 bg-indigo-500/5 placeholder-indigo-400/20"
                                        )}
                                    />
                                </FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

