'use client';

import { useState, useRef, ChangeEvent, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, DollarSign, Sparkles, Loader2, GripVertical, ShieldCheck, Eye, ImagePlus, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { CameraCapture } from '@/components/ui/camera-capture';
import { Reorder } from 'framer-motion';
import { BeforeUnload } from '@/hooks/use-before-unload';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { doc } from 'firebase/firestore';
import { updateListing } from '@/app/actions/seller-actions';
import { MultibuyTier } from '@/types/multibuy';
import { getMultibuyTemplates } from '@/app/actions/multibuy-actions';
import { MultibuyConfig } from '@/components/sell/MultibuyConfig';
import {
    DEFAULT_CATEGORIES,
    DEFAULT_SUB_CATEGORIES,
    DEFAULT_CONDITIONS,
    CATEGORY_SNEAKERS,
    CATEGORY_ACCESSORIES,
    CATEGORY_TRADING_CARDS,
    isCardCategory
} from '@/lib/constants/marketplace';

const formSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    price: z.coerce.number().min(0, 'Price must be 0 or more'),
    category: z.string().min(1, 'Category is required'),
    subCategory: z.string().optional(),
    condition: z.string().min(1, 'Condition is required'),
    quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
    isReverseBidding: z.boolean().default(false),
    isNegotiable: z.boolean().default(false),
    autoRepricingEnabled: z.boolean().default(false),
    isVault: z.boolean().default(false),
    // Sneaker specific
    brand: z.string().optional(),
    model: z.string().optional(),
    styleCode: z.string().optional(),
    size: z.string().optional(),
    colorway: z.string().optional(),

    // Legacy/Generic
    year: z.coerce.number().optional(),
    manufacturer: z.string().optional(),
    cardNumber: z.string().optional(),
    grade: z.string().optional(),
    gradingCompany: z.string().optional(),
    certNumber: z.string().optional(),
    weight: z.string().optional(),
    dimensions: z.string().optional(),
    material: z.string().optional(),
    authentication: z.string().optional(),
    authenticationNumber: z.string().optional(),
    signer: z.string().optional(),
    isUntimed: z.boolean().default(false),
    multibuyEnabled: z.boolean().default(false),
    multibuyTiers: z.array(z.object({
        minQuantity: z.number().min(2),
        discountPercent: z.number().min(1).max(50),
    })).default([]),
    imageFiles: z.array(z.any()).default([]),
}).refine(data => {
    if (data.isUntimed) return true;
    return data.price >= 0.01;
}, {
    message: "Price must be at least $0.01",
    path: ["price"],
});

type ListingFormValues = z.infer<typeof formSchema>;

interface ListingFormProps {
    initialData: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ListingForm({ initialData, onSuccess, onCancel }: ListingFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { firestore } = useFirebase();
    const { user, isUserLoading: authLoading } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.imageUrls || []);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
    const { data: marketplaceOptions } = useDoc<any>(optionsRef);

    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 5;

    const form = useForm<ListingFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData.title || '',
            description: initialData.description || '',
            price: Number(initialData.price || 0),
            category: initialData.category || '',
            subCategory: initialData.subCategory || '',
            condition: initialData.condition || '',
            quantity: Number(initialData.quantity || 1),
            isReverseBidding: initialData.isReverseBidding || false,
            isNegotiable: initialData.isNegotiable || false,
            autoRepricingEnabled: initialData.autoRepricingEnabled || false,
            isVault: initialData.isVault || false,
            isUntimed: initialData.isUntimed || false,
            imageFiles: initialData.imageUrls || [],

            // New fields
            brand: initialData.brand || '',
            model: initialData.model || '',
            styleCode: initialData.styleCode || '',
            size: initialData.size || '',
            colorway: initialData.colorway || '',

            year: initialData.year ? Number(initialData.year) : '' as any,
            manufacturer: initialData.manufacturer || '',
            cardNumber: initialData.cardNumber || '',
            grade: initialData.grade || '',
            gradingCompany: initialData.gradingCompany || '',
            certNumber: initialData.certNumber || '',
            weight: initialData.weight || '',
            dimensions: initialData.dimensions || '',
            material: initialData.material || '',
            authentication: initialData.authentication || '',
            authenticationNumber: initialData.authenticationNumber || '',
            signer: initialData.signer || '',
            multibuyEnabled: initialData.multibuyEnabled || false,
            multibuyTiers: initialData.multibuyTiers || [],
        },
    });

    const watchedCategory = form.watch('category');

    // Determine type from category
    // Default to general if not matched
    let listingType: 'sneakers' | 'accessories' | 'cards' | 'general' = 'general';
    if (watchedCategory === CATEGORY_SNEAKERS) {
        listingType = 'sneakers';
    } else if (watchedCategory === CATEGORY_ACCESSORIES) {
        listingType = 'accessories';
    } else if (isCardCategory(watchedCategory)) {
        listingType = 'cards';
    }

    const CATEGORIES_OPTIONS: string[] = marketplaceOptions?.categories || DEFAULT_CATEGORIES;
    const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || DEFAULT_CONDITIONS;
    const SUB_CATEGORIES: Record<string, string[]> = {
        [CATEGORY_SNEAKERS]: marketplaceOptions?.subCategories?.sneakers || DEFAULT_SUB_CATEGORIES[CATEGORY_SNEAKERS],
        [CATEGORY_ACCESSORIES]: marketplaceOptions?.subCategories?.accessories || DEFAULT_SUB_CATEGORIES[CATEGORY_ACCESSORIES],
        [CATEGORY_TRADING_CARDS]: marketplaceOptions?.subCategories?.collector_cards || DEFAULT_SUB_CATEGORIES[CATEGORY_TRADING_CARDS],
        'General': marketplaceOptions?.subCategories?.general || DEFAULT_SUB_CATEGORIES['General']
    };

    const imageFiles = form.watch('imageFiles');

    const addImages = useCallback((newFiles: File[]) => {
        const currentFiles = form.getValues('imageFiles');
        if (currentFiles.length + newFiles.length > 8) {
            toast({ title: "Maximum 8 images allowed.", variant: "destructive" });
            return;
        }
        const validFiles: File[] = [];
        const newPreviews: string[] = [];
        newFiles.forEach(file => {
            validFiles.push(file);
            newPreviews.push(URL.createObjectURL(file));
        });
        form.setValue('imageFiles', [...currentFiles, ...validFiles], { shouldValidate: true });
        setImagePreviews(prev => [...prev, ...newPreviews]);
    }, [form, toast]);

    const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        addImages(Array.from(e.target.files || []));
        if (fileInputRef.current) fileInputRef.current.value = '';
    }, [addImages]);

    const removeImage = (index: number) => {
        const currentFiles = form.getValues('imageFiles');
        const urlToRemove = imagePreviews[index];
        form.setValue('imageFiles', currentFiles.filter((_, i) => i !== index), { shouldValidate: true });
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        if (urlToRemove && urlToRemove.startsWith('blob:')) URL.revokeObjectURL(urlToRemove);
    };

    const handleNext = async () => {
        let fieldsToValidate: any[] = [];

        switch (currentStep) {
            case 1:
                fieldsToValidate = ['imageFiles'];
                // Ensure at least one photo? The schema might handle it, but we can check here.
                if (form.getValues('imageFiles').length === 0) {
                    toast({ title: "Please upload at least one photo", variant: "destructive" });
                    return;
                }
                break;
            case 2:
                fieldsToValidate = ['title', 'subCategory', 'condition'];
                break;
            case 3:
                fieldsToValidate = ['price', 'quantity'];
                break;
            case 4:
                // Specs validation is usually optional but let's trigger anyway
                if (listingType === 'sneakers') fieldsToValidate = ['brand', 'model', 'size'];
                else if (listingType === 'cards') fieldsToValidate = ['year', 'manufacturer'];
                break;
            case 5:
                fieldsToValidate = ['isNegotiable'];
                break;
        }

        const isValid = await form.trigger(fieldsToValidate as any);
        if (isValid) {
            setCurrentStep(prev => Math.min(prev + 1, totalSteps));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            toast({ title: "Please fill required fields", variant: "destructive" });
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleAutoFill = async () => {
        const currentFiles = form.getValues('imageFiles');
        if (!currentFiles.length || !user) return;
        setIsAnalyzing(true);
        try {
            const filesToProcess = currentFiles.slice(0, 3).filter((f: any) => f instanceof File) as File[];
            let photoUrls: string[] = [];
            if (filesToProcess.length > 0) {
                photoUrls = await uploadImages(filesToProcess, `temp-analysis/${user.uid}`);
            }
            const existingUrls = currentFiles.filter((f: any) => typeof f === 'string') as string[];
            const allUrls = [...existingUrls, ...photoUrls];

            if (allUrls.length === 0) return;
            const idToken = await user.getIdToken();
            const suggestions = await suggestListingDetails({ photoDataUris: allUrls, title: form.getValues('title') || undefined, idToken });
            if (suggestions) {
                Object.entries(suggestions).forEach(([key, value]) => { if (value) form.setValue(key as any, value); });
                toast({ title: '✨ AI Magic Applied!' });
            }
        } catch (error: any) {
            toast({ title: "Auto-Fill Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        const isValid = await form.trigger();
        if (!isValid) {
            toast({ title: "Form Incomplete", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }
        if (!user) return;
        try {
            const data = form.getValues();

            const newFiles = data.imageFiles.filter(f => f instanceof File) as File[];
            const existingUrls = data.imageFiles.filter(f => typeof f === 'string') as string[];

            const newImageUrls = await uploadImages(newFiles, `products/${user.uid}`);
            const finalImageUrls = [...existingUrls, ...newImageUrls];

            const { imageFiles: _, ...cleanData } = data;

            const idToken = await user.getIdToken();
            const result = await updateListing(idToken, initialData.id, {
                ...cleanData,
                imageUrls: finalImageUrls
            });

            if (result.success) {
                toast({ title: "Success", description: "Listing updated." });
                if (onSuccess) onSuccess();
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const captureMode = listingType === 'cards' ? 'card' : 'general';
    const STEP_TITLES = [
        "Product Photos",
        "Essential Info",
        "Pricing & Quantity",
        "Item Specifications",
        "Listing Options"
    ];

    return (
        <Form {...form}>
            <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
            <div className="flex flex-col h-full bg-slate-50">
                {/* Sticky Header with Progress */}
                <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                    <div className="p-4 flex items-center justify-between max-w-2xl mx-auto w-full">
                        <div>
                            <h2 className="text-lg font-bold">Edit Listing</h2>
                            <p className="text-xs text-gray-500">Step {currentStep} of {totalSteps}: {STEP_TITLES[currentStep - 1]}</p>
                        </div>
                        <div className="flex gap-2">
                            {onCancel && <Button variant="ghost" size="sm" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
                        </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 h-1">
                        <div
                            className="bg-primary h-full transition-all duration-500 ease-out"
                            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-2xl mx-auto pb-24">
                        {currentStep === 1 && (
                            <Card className="border-0 shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <CardHeader className="bg-slate-900 text-white p-6">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            <ImagePlus className="h-6 w-6" /> Step 1: Photos
                                        </CardTitle>
                                        <Badge variant="outline" className="text-white border-white/30 bg-white/10">Required</Badge>
                                    </div>
                                    <CardDescription className="text-slate-300 mt-2">
                                        Add up to 8 high-quality photos. First image is the cover.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all group"
                                        >
                                            <div className="bg-primary/10 p-3 rounded-full group-hover:scale-110 transition-transform">
                                                <Upload className="h-6 w-6 text-primary" />
                                            </div>
                                            <span className="text-xs font-medium mt-2 text-slate-500">Upload</span>
                                            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                                        </div>
                                        <div className="aspect-square">
                                            <CameraCapture onCapture={addImages} captureMode={captureMode} variant="hero" maxFiles={8 - imageFiles.length} />
                                        </div>
                                        {imagePreviews.map((p, i) => (
                                            <div key={p} className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border group shadow-sm">
                                                <Image src={p} fill alt="thumb" className="object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={() => removeImage(i)}
                                                        className="h-8 w-8 rounded-full"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                {i === 0 && <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-[10px] text-white font-bold rounded">COVER</div>}
                                            </div>
                                        ))}
                                    </div>

                                    {imageFiles.length > 0 && (
                                        <div className="bg-primary/5 rounded-2xl p-4 border border-primary/10 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/20 p-2 rounded-lg">
                                                    <Sparkles className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">AI Magic Available</p>
                                                    <p className="text-[10px] text-slate-500">Auto-fill details from your photos</p>
                                                </div>
                                            </div>
                                            <Button
                                                onClick={handleAutoFill}
                                                disabled={isAnalyzing}
                                                size="sm"
                                                variant="default"
                                                className="shadow-sm"
                                            >
                                                {isAnalyzing ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Sparkles className="h-3 w-3 mr-2" />}
                                                Auto-Fill
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 2 && (
                            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardHeader className="p-6 pb-0">
                                    <CardTitle>Step 2: Essential Info</CardTitle>
                                    <CardDescription>Tell buyers the basics about your item.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Item Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="What are you selling?" className="text-lg py-6" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="subCategory" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Category</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="Select one..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {(SUB_CATEGORIES[watchedCategory] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="condition" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Condition</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-11">
                                                            <SelectValue placeholder="Condition" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Description</FormLabel>
                                            <FormControl>
                                                <Textarea rows={6} placeholder="Describe any flaws, unique features, or history..." className="resize-none" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 3 && (
                            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardHeader className="p-6 pb-0">
                                    <CardTitle>Step 3: Price & Quantity</CardTitle>
                                    <CardDescription>Set your price and available stock.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-8">
                                    <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem className={cn("transition-opacity duration-300", form.watch('isUntimed') ? 'opacity-30 pointer-events-none' : 'opacity-100')}>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">List Price (AUD)</FormLabel>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                                                <FormControl>
                                                    <Input type="number" step="0.01" className="pl-10 text-3xl font-bold h-20" placeholder="0.00" {...field} disabled={form.watch('isUntimed')} />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="bg-slate-50 rounded-2xl p-4 border flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-white p-2 rounded-lg border shadow-sm">
                                                <Eye className="h-5 w-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">Quantity Available</p>
                                                <p className="text-[10px] text-slate-500">How many do you have for sale?</p>
                                            </div>
                                        </div>
                                        <FormField control={form.control} name="quantity" render={({ field }) => (
                                            <FormControl>
                                                <Input type="number" min="1" className="w-24 text-center text-lg font-bold h-12" {...field} />
                                            </FormControl>
                                        )} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 4 && (
                            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardHeader className="p-6 pb-0">
                                    <CardTitle>Step 4: Item Specs</CardTitle>
                                    <CardDescription>Specific details for your {listingType}.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {listingType === 'sneakers' && (
                                        <>
                                            <FormField control={form.control} name="brand" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Brand</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="model" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Model</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="styleCode" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Style Code</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="size" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Size</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="colorway" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Colorway</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="year" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                    {listingType === 'cards' && (
                                        <>
                                            <FormField control={form.control} name="year" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="cardNumber" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Card #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="gradingCompany" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Grading Co.</FormLabel><FormControl><Input placeholder="PSA, BGS, SGC..." {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                    {(listingType === 'general' || listingType === 'accessories') && (
                                        <>
                                            <FormField control={form.control} name="dimensions" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Dimensions</FormLabel><FormControl><Input placeholder="30x40x10 cm" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="material" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Material</FormLabel><FormControl><Input placeholder="Leather, Canvas..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="authentication" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Authentication</FormLabel><FormControl><Input placeholder="Beckett, JSA..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="weight" render={({ field }) => (
                                                <FormItem><FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-500">Weight</FormLabel><FormControl><Input placeholder="1.5 kg" {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {currentStep === 5 && (
                            <Card className="border-0 shadow-lg animate-in fade-in slide-in-from-right-4 duration-500">
                                <CardHeader className="p-6 pb-0">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-green-500" />
                                        <CardTitle>Step 5: Listing Options</CardTitle>
                                    </div>
                                    <CardDescription>Final settings for your listing.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <FormField control={form.control} name="isNegotiable" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-white shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="space-y-0.5 pe-4">
                                                <FormLabel className="font-bold">Allow Offers</FormLabel>
                                                <FormDescription className="text-[10px]">Buyers can send binding offers for this item.</FormDescription>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="isReverseBidding" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-white shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="space-y-0.5 pe-4">
                                                <FormLabel className="font-bold">Reverse Bidding</FormLabel>
                                                <FormDescription className="text-[10px]">Dutch auction style: lowest bid wins.</FormDescription>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="isVault" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-white shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="space-y-0.5 pe-4">
                                                <FormLabel className="font-bold">Vault Item</FormLabel>
                                                <FormDescription className="text-[10px]">Mark as a vaulted investment item.</FormDescription>
                                            </div>
                                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="isUntimed" render={({ field }) => (
                                        <FormItem className="flex items-center justify-between rounded-2xl border p-4 bg-white shadow-sm hover:border-primary/30 transition-colors">
                                            <div className="space-y-0.5 pe-4">
                                                <FormLabel className="font-bold">Untimed Listing</FormLabel>
                                                <FormDescription className="text-[10px]">Open for offers with no set list price.</FormDescription>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={(checked) => {
                                                    field.onChange(checked);
                                                    if (checked) { form.setValue('price', 0); form.setValue('isNegotiable', true); }
                                                }} />
                                            </FormControl>
                                        </FormItem>
                                    )} />

                                    <div className="pt-4 border-t mt-4">
                                        <MultibuyConfig form={form} />
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                {/* Fixed Footer Navigation */}
                <div className="bg-white border-t border-slate-200 p-4 fixed bottom-0 left-0 right-0 z-40 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                    <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleBack}
                            disabled={currentStep === 1 || isSubmitting}
                            className="flex-1 sm:flex-none h-12 px-6 rounded-xl"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Back
                        </Button>

                        {currentStep < totalSteps ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="flex-[2] sm:flex-none h-12 px-8 rounded-xl shadow-md"
                            >
                                Next Step <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="flex-[2] sm:flex-none h-12 px-8 rounded-xl shadow-lg bg-primary hover:bg-primary/90"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Finalize Listing
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </Form>
    );
}

