
'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandRequestModal } from '../BrandRequestModal';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { isCardCategory } from '@/lib/constants/marketplace';

interface DetailsStepProps {
    form: any;
    selectedType: 'sneakers' | 'collector-cards';
    subCategories: Record<string, string[]>;
    conditionOptions: string[];
    onAutoFill?: () => Promise<void>;
    isAnalyzing?: boolean;
    imageFiles?: any[];
}

export function DetailsStep({ form, selectedType, subCategories, conditionOptions, onAutoFill, isAnalyzing, imageFiles = [] }: DetailsStepProps) {
    const category = form.watch('category') || (selectedType === 'sneakers' ? 'Sneakers' : 'Collector Cards');
    const isTradingCard = isCardCategory(category);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Item Details</h2>
                <p className="text-muted-foreground">Describe your {isTradingCard ? 'card' : 'item'} accurately.</p>
            </div>

            {imageFiles.length > 0 && (
                <div className="p-5 bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mb-6 shadow-sm">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                            <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-indigo-900 dark:text-indigo-300 text-lg">AI Assistant Available</h4>
                            <p className="text-sm text-indigo-700 dark:text-indigo-400/80">Save time. We can scan your photos and auto-fill the details below.</p>
                        </div>
                        <Button
                            onClick={(e) => { e.preventDefault(); onAutoFill?.(); }}
                            disabled={isAnalyzing}
                            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-6 font-bold shadow-md shadow-indigo-200 dark:shadow-none"
                        >
                            {isAnalyzing ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            {isAnalyzing ? 'Analyzing...' : 'Auto-Fill with AI'}
                        </Button>
                    </div>
                </div>
            )}

            <Card className="border-0 shadow-md">
                <CardHeader><CardTitle>Core Information</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name="title" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input placeholder={isTradingCard ? "e.g. 2023 Panini Prizm Victor Wembanyama Rookie" : "e.g. Air Jordan 1 High OG Chicago"} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="subCategory" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Specific Category</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selection" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {(subCategories[category] || []).map((s: string) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="condition" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condition <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
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
                                <div className="flex items-center justify-between">
                                    <FormLabel className="text-base font-bold">Brand <span className="text-red-500">*</span></FormLabel>
                                    <BrandRequestModal />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                    <FormLabel>Manufacturer / Set <span className="text-red-500">*</span></FormLabel>
                                    <FormControl><Input placeholder="e.g. Panini Prizm" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="year" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Year </FormLabel>
                                    <FormControl><Input type="number" placeholder="2023" {...field} /></FormControl>
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
                <Card className="border-0 shadow-md">
                    <CardHeader><CardTitle>Trading Card Specs</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="gradingCompany" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grading Company</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="PSA, BGS, SGC..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        {['Raw', 'PSA', 'BGS', 'SGC', 'CGC', 'HGA', 'Other'].map((co) => (
                                            <SelectItem key={co} value={co}>{co}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="grade" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Grade</FormLabel>
                                <FormControl><Input placeholder="e.g. 10, 9.5" {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="certNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Certification #</FormLabel>
                                <FormControl><Input placeholder="PSA Cert #" {...field} /></FormControl>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="cardNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Card Number</FormLabel>
                                <FormControl><Input placeholder="e.g. #123" {...field} /></FormControl>
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-0 shadow-md">
                    <CardHeader><CardTitle>Sneaker Specs</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField control={form.control} name="size" render={({ field }) => (
                            <FormItem><FormLabel>Size (US)</FormLabel><FormControl><Input placeholder="e.g. 10.5" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="styleCode" render={({ field }) => (
                            <FormItem><FormLabel>Style Code</FormLabel><FormControl><Input placeholder="e.g. DZ5485-612" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="colorway" render={({ field }) => (
                            <FormItem><FormLabel>Colorway</FormLabel><FormControl><Input placeholder="e.g. Varsity Red/Black/Sail" {...field} /></FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="year" render={({ field }) => (
                            <FormItem><FormLabel>Release Year</FormLabel><FormControl><Input type="number" placeholder="2015" {...field} /></FormControl></FormItem>
                        )} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
