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
import { Upload, Trash2, DollarSign, Sparkles, Loader2, GripVertical, ShieldCheck, Eye, ImagePlus, ChevronLeft, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { CameraCapture } from '@/components/ui/camera-capture';
import { Reorder } from 'framer-motion';
import { BeforeUnload } from '@/hooks/use-before-unload';
import EnhancedAICardGrader from '@/components/products/EnhancedAICardGrader';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { doc } from 'firebase/firestore';
import { updateListing } from '@/app/actions/seller-actions';
import { MultibuyTier } from '@/types/multibuy';
import { getMultibuyTemplates } from '@/app/actions/multibuy-actions';
import { MultibuyConfig } from '@/components/sell/MultibuyConfig';

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
    imageFiles: z.array(z.any()).default([]),
    // Specs
    year: z.coerce.number().optional(),
    manufacturer: z.string().optional(),
    cardNumber: z.string().optional(),
    grade: z.string().optional(),
    gradingCompany: z.string().optional(),
    certNumber: z.string().optional(),
    denomination: z.string().optional(),
    mintMark: z.string().optional(),
    country: z.string().optional(),
    metal: z.string().optional(),
    purity: z.string().optional(),
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

    // Determine type from category
    let listingType: 'cards' | 'coins' | 'general' = 'general';
    if (initialData?.category === 'Collector Cards') listingType = 'cards';
    else if (initialData?.category === 'Coins') listingType = 'coins';

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
            year: initialData.year ? Number(initialData.year) : '' as any,
            manufacturer: initialData.manufacturer || '',
            cardNumber: initialData.cardNumber || '',
            grade: initialData.grade || '',
            gradingCompany: initialData.gradingCompany || '',
            certNumber: initialData.certNumber || '',
            denomination: initialData.denomination || '',
            mintMark: initialData.mintMark || '',
            country: initialData.country || '',
            metal: initialData.metal || '',
            purity: initialData.purity || '',
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

    const CATEGORIES_OPTIONS: string[] = marketplaceOptions?.categories || ['Collector Cards', 'Coins', 'Collectibles', 'General'];
    const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
    const SUB_CATEGORIES: Record<string, string[]> = {
        'Collector Cards': marketplaceOptions?.subCategories?.collector_cards || ['Sports Cards', 'Trading Cards'],
        'Coins': marketplaceOptions?.subCategories?.coins || ['Coins', 'World Coins', 'Ancient Coins', 'Bullion'],
        'Collectibles': marketplaceOptions?.subCategories?.collectibles || ['Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'],
        'General': marketplaceOptions?.subCategories?.general || ['Household', 'Electronics', 'Clothing', 'Books', 'Other']
    };

    const imageFiles = form.watch('imageFiles');

    const addImages = useCallback((newFiles: File[]) => {
        const currentFiles = form.getValues('imageFiles');
        if (currentFiles.length + newFiles.length > 5) {
            toast({ title: "Maximum 5 images allowed.", variant: "destructive" });
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

            const result = await updateListing(initialData.id, {
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

    const captureMode = listingType === 'cards' ? 'card' : listingType === 'coins' ? 'coin' : 'general';

    return (
        <Form {...form}>
            <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
            <div className="flex flex-col h-full bg-slate-50">
                <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Edit Listing</h2>
                            <p className="text-sm text-gray-500">Update your product details</p>
                        </div>
                        <div className="flex gap-2">
                            {onCancel && <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
                            <Button onClick={handleSave} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-0 shadow-md">
                                <CardHeader className="bg-slate-900 text-white p-5">
                                    <CardTitle className="text-lg flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Photos</CardTitle>
                                </CardHeader>
                                <CardContent className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center">
                                            <Upload className="h-8 w-8 text-primary" />
                                            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                                        </div>
                                        <div className="aspect-square">
                                            <CameraCapture onCapture={addImages} captureMode={captureMode} variant="hero" maxFiles={5 - imageFiles.length} />
                                        </div>
                                    </div>
                                    {imagePreviews.map((p, i) => (
                                        <div key={p} className="flex items-center gap-3 bg-white p-2 border rounded-lg">
                                            <div className="relative h-10 w-10 bg-slate-100 rounded overflow-hidden"><Image src={p} fill alt="thumb" className="object-cover" /></div>
                                            <span className="flex-1 text-xs font-medium">Image {i + 1}</span>
                                            <Button variant="ghost" size="icon" onClick={() => removeImage(i)} className="text-red-500"><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    {imageFiles.length > 0 && (
                                        <Button onClick={handleAutoFill} disabled={isAnalyzing} variant="outline" className="w-full">
                                            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                            Auto-Fill with AI
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            {listingType === 'cards' && (
                                <EnhancedAICardGrader
                                    onGradeComplete={(grade) => form.setValue('condition', grade)}
                                    imageFiles={imageFiles}
                                    onApplySuggestions={(res) => {
                                        Object.entries(res).forEach(([k, v]) => { if (v) form.setValue(k as any, v) });
                                    }}
                                />
                            )}
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <Card className="border-0 shadow-md">
                                <CardHeader><CardTitle>Essential Information</CardTitle></CardHeader>
                                <CardContent className="space-y-6">
                                    <FormField control={form.control} name="title" render={({ field }) => (
                                        <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="Descriptive title..." {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="subCategory" render={({ field }) => (
                                            <FormItem><FormLabel>Specifc Category</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selection" /></SelectTrigger></FormControl><SelectContent>{(SUB_CATEGORIES[form.getValues('category')] || []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                        <FormField control={form.control} name="condition" render={({ field }) => (
                                            <FormItem><FormLabel>Condition</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger></FormControl><SelectContent>{CONDITION_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></FormItem>
                                        )} />
                                    </div>
                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader><CardTitle>Price & Quantity</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="price" render={({ field }) => (
                                        <FormItem className={form.watch('isUntimed') ? 'opacity-50 pointer-events-none' : ''}>
                                            <FormLabel>Price (AUD)</FormLabel>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <FormControl>
                                                    <Input type="number" step="0.01" className="pl-9" {...field} disabled={form.watch('isUntimed')} />
                                                </FormControl>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="quantity" render={({ field }) => (
                                        <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
                                    )} />
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader><CardTitle>{listingType === 'cards' ? 'Card Specs' : listingType === 'coins' ? 'Coin Specs' : 'Item Specs'}</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {listingType === 'cards' && (
                                        <>
                                            <FormField control={form.control} name="year" render={({ field }) => (
                                                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="manufacturer" render={({ field }) => (
                                                <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="cardNumber" render={({ field }) => (
                                                <FormItem><FormLabel>Card #</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="gradingCompany" render={({ field }) => (
                                                <FormItem><FormLabel>Grading Co.</FormLabel><FormControl><Input placeholder="PSA, BGS, SGC..." {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                    {listingType === 'coins' && (
                                        <>
                                            <FormField control={form.control} name="year" render={({ field }) => (
                                                <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="denomination" render={({ field }) => (
                                                <FormItem><FormLabel>Denomination</FormLabel><FormControl><Input placeholder="e.g. $1, 50c..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="mintMark" render={({ field }) => (
                                                <FormItem><FormLabel>Mint Mark</FormLabel><FormControl><Input placeholder="e.g. P, D, S..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="metal" render={({ field }) => (
                                                <FormItem><FormLabel>Metal</FormLabel><FormControl><Input placeholder="Silver, Gold..." {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                    {listingType === 'general' && (
                                        <>
                                            <FormField control={form.control} name="dimensions" render={({ field }) => (
                                                <FormItem><FormLabel>Dimensions (WxHxD)</FormLabel><FormControl><Input placeholder="30x40x10 cm" {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="material" render={({ field }) => (
                                                <FormItem><FormLabel>Material</FormLabel><FormControl><Input placeholder="Leather, Canvas..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="authentication" render={({ field }) => (
                                                <FormItem><FormLabel>Authentication (COA)</FormLabel><FormControl><Input placeholder="Beckett, JSA..." {...field} /></FormControl></FormItem>
                                            )} />
                                            <FormField control={form.control} name="weight" render={({ field }) => (
                                                <FormItem><FormLabel>Weight</FormLabel><FormControl><Input placeholder="1.5 kg" {...field} /></FormControl></FormItem>
                                            )} />
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <DollarSign className="h-5 w-5" /> Selling Options
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="isNegotiable"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Allow Offers</FormLabel>
                                                    <FormDescription className="text-[10px]">Buyers can make binding offers on this item.</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="isReverseBidding"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Reverse Bidding</FormLabel>
                                                    <FormDescription className="text-[10px]">Lowest bid wins (Dutch auction style).</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="isVault"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Vault Item</FormLabel>
                                                    <FormDescription className="text-[10px]">Specifically marked as a vaulted investment item.</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="isUntimed"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center justify-between rounded-lg border p-3">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Untimed Listing</FormLabel>
                                                    <FormDescription className="text-[10px]">Open for offers, no set price.</FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={(checked) => {
                                                            field.onChange(checked);
                                                            if (checked) {
                                                                form.setValue('price', 0);
                                                                form.setValue('isNegotiable', true);
                                                            }
                                                        }}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                    <MultibuyConfig form={form} />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </Form>
    );
}
