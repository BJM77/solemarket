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
import { Upload, Trash2, DollarSign, Sparkles, Loader2, GripVertical, ShieldCheck, Eye, ImagePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { CameraCapture } from '@/components/ui/camera-capture';
import { Reorder } from 'framer-motion';
import { BeforeUnload } from '@/hooks/use-before-unload';
import EnhancedAICardGrader from '@/components/products/EnhancedAICardGrader';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { EbayPriceLookup } from '@/components/sell/EbayPriceLookup';
import { doc } from 'firebase/firestore';
import { saveDraftListing } from '@/app/actions/sell';

const VAULT_MINIMUM_PRICE = 0;

const formSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  price: z.coerce.number().positive('Price must be a positive number.'),
  category: z.string().min(1, 'A category is required.'),
  subCategory: z.string().optional(),
  condition: z.string().min(1, 'Condition is required.'),
  manufacturer: z.string().optional(),
  year: z.coerce.number().int().min(1900).max(new Date().getFullYear() + 1).optional().or(z.literal(0)).or(z.nan()).or(z.null()).transform(val => val || undefined),
  cardNumber: z.string().optional(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
  isReverseBidding: z.boolean().default(false),
  autoRepricingEnabled: z.boolean().default(false),
  isVault: z.boolean().default(false),
  imageFiles: z.array(z.any()).min(1, 'At least one image is required.').max(5, 'A maximum of 5 images are allowed.').default([]),
});

type ListingFormValues = z.infer<typeof formSchema>;

export default function CreateListingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading: authLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPriceLookup, setShowPriceLookup] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
  const { data: marketplaceOptions } = useDoc<any>(optionsRef);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      subCategory: '',
      condition: '',
      manufacturer: '',
      year: undefined,
      cardNumber: '',
      quantity: 1,
      isReverseBidding: false,
      autoRepricingEnabled: false,
      isVault: false,
      imageFiles: [],
    },
  });

  const CATEGORIES_OPTIONS = marketplaceOptions?.categories || ['Collector Cards', 'Coins', 'Collectibles', 'General'];
  const CONDITION_OPTIONS = marketplaceOptions?.conditions || ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];
  const SUB_CATEGORIES: Record<string, string[]> = {
    'Collector Cards': marketplaceOptions?.subCategories?.collector_cards || ['Sports Cards', 'Trading Cards'],
    'Coins': marketplaceOptions?.subCategories?.coins || ['Coins', 'World Coins', 'Ancient Coins', 'Bullion'],
    'Collectibles': marketplaceOptions?.subCategories?.collectibles || ['Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'],
    'General': marketplaceOptions?.subCategories?.general || ['Household', 'Electronics', 'Clothing', 'Books', 'Other']
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in?redirect=/sell/create');
    }
  }, [user, authLoading, router]);

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [imagePreviews]);

  const selectedCategory = form.watch('category');
  const imageFiles = form.watch('imageFiles');

  // Optimized File Handling
  const addImages = useCallback((newFiles: File[]) => {
    const currentFiles = form.getValues('imageFiles');
    if (currentFiles.length + newFiles.length > 5) {
      toast({ title: "Maximum 5 images allowed.", variant: "destructive" });
      return;
    }
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    newFiles.forEach(file => {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: `Image ${file.name} is too large (max 5MB).`, variant: 'destructive' });
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });
    const updatedFiles = [...currentFiles, ...validFiles];
    form.setValue('imageFiles', updatedFiles, { shouldValidate: true });
    setImagePreviews(prev => [...prev, ...newPreviews]);
  }, [form, toast]);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    addImages(Array.from(e.target.files || []));
    if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
  }, [addImages]);

  const removeImage = (index: number) => {
    const currentFiles = form.getValues('imageFiles');
    const urlToRemove = imagePreviews[index];
    form.setValue('imageFiles', currentFiles.filter((_, i) => i !== index), { shouldValidate: true });
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (urlToRemove && urlToRemove.startsWith('blob:')) URL.revokeObjectURL(urlToRemove);
  };

  const handleImageReorder = (newOrder: string[]) => {
    const currentFiles = form.getValues('imageFiles');
    const reorderedFiles: File[] = [];
    newOrder.forEach(previewUrl => {
      const originalIndex = imagePreviews.indexOf(previewUrl);
      if (originalIndex > -1) reorderedFiles.push(currentFiles[originalIndex]);
    });
    form.setValue('imageFiles', reorderedFiles);
    setImagePreviews(newOrder);
  };

  // Memoized Auto-Fill State
  const isAutoFillAvailable = useMemo(() => {
    return imageFiles.length > 0 && !isAnalyzing;
  }, [imageFiles.length, isAnalyzing]);

  const handleAutoFill = async () => {
    const currentFiles = form.getValues('imageFiles');
    if (!currentFiles.length || !user) return;

    setIsAnalyzing(true);
    try {
      const filesToProcess = currentFiles.slice(0, 3).filter((f: any) => f instanceof File) as File[];
      if (!filesToProcess.length) throw new Error("Please upload new photos.");

      const photoUrls = await uploadImages(filesToProcess, `temp-analysis/${user.uid}`);
      const idToken = await user.getIdToken();

      const suggestions = await suggestListingDetails({
        photoDataUris: photoUrls,
        title: form.getValues('title') || undefined,
        idToken,
      });

      if (suggestions) {
        Object.entries(suggestions).forEach(([key, value]) => {
          if (value) form.setValue(key as any, value);
        });
        if (suggestions.category && SUB_CATEGORIES[suggestions.category]?.includes(suggestions.subCategory)) {
          form.setValue('subCategory', suggestions.subCategory);
        }
        toast({ title: '✨ AI Magic Applied!', description: "We've filled in the details for you." });
      }
    } catch (error: any) {
      toast({ title: "Auto-Fill Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReview = async () => {
    setIsSubmitting(true);
    const isValid = await form.trigger();
    if (!isValid) {
      // Scroll to first error
      const firstError = Object.keys(form.formState.errors)[0];
      const element = document.querySelector(`[name="${firstError}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast({ title: "Check your form", description: "Please fix the highlighted errors.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    if (!user) {
      setIsSubmitting(false);
      return;
    }

    try {
      const data = form.getValues();
      const imageFiles = data.imageFiles.filter(f => f instanceof File) as File[];
      const imageUrls = await uploadImages(imageFiles, `products/${user.uid}`);

      const draftId = await saveDraftListing(user.uid, {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        subCategory: data.subCategory,
        condition: data.condition,
        manufacturer: data.manufacturer,
        year: data.year,
        cardNumber: data.cardNumber,
        quantity: data.quantity,
        isReverseBidding: data.isReverseBidding,
        autoRepricingEnabled: data.autoRepricingEnabled,
        isVault: data.isVault,
        imageUrls: imageUrls
      });

      router.push(`/sell/review?draftId=${draftId}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyAiSuggestions = useCallback((result: any) => {
    if (!result) return;

    if (result.title) form.setValue('title', result.title, { shouldValidate: true });
    if (result.description) form.setValue('description', result.description, { shouldValidate: true });
    if (result.price) form.setValue('price', result.price, { shouldValidate: true });
    if (result.category) {
      form.setValue('category', result.category, { shouldValidate: true });
      // Only set subCategory if it's valid for the category
      if (result.subCategory && SUB_CATEGORIES[result.category]?.includes(result.subCategory)) {
        form.setValue('subCategory', result.subCategory, { shouldValidate: true });
      }
    }
    if (result.condition) form.setValue('condition', result.condition, { shouldValidate: true });
    if (result.manufacturer) form.setValue('manufacturer', result.manufacturer, { shouldValidate: true });
    if (result.year) form.setValue('year', result.year, { shouldValidate: true });
    if (result.cardNumber) form.setValue('cardNumber', result.cardNumber, { shouldValidate: true });

    toast({ title: '✨ AI Suggestions Applied!', description: "We've updated the form with AI-generated details." });
  }, [form, toast]);

  const getCaptureMode = () => form.getValues('category') === 'Collector Cards' ? 'card' : 'default';

  if (authLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user) return <div className="flex h-screen items-center justify-center">Redirecting...</div>;

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">List an Item</h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => router.back()}>Cancel</Button>
              <Button onClick={handleReview} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white font-semibold">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Review
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT COLUMN: Photos & AI */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-md overflow-hidden">
                <CardHeader className="bg-slate-900 text-white p-5">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImagePlus className="h-5 w-5" /> Product Photos
                  </CardTitle>
                  <CardDescription className="text-slate-400">Upload up to 5 photos.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-all group">
                      <div className="bg-white p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                        <Upload className="h-6 w-6 text-primary" />
                      </div>
                      <span className="text-xs font-semibold mt-2 text-slate-600">Upload</span>
                      <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </div>
                    <div className="aspect-square">
                      <CameraCapture onCapture={addImages} captureMode={getCaptureMode()} variant="hero" maxFiles={5 - imageFiles.length} />
                    </div>
                  </div>

                  {imagePreviews.length > 0 && (
                    <Reorder.Group axis="y" values={imagePreviews} onReorder={handleImageReorder} className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                      {imagePreviews.map((preview, index) => (
                        <Reorder.Item key={preview} value={preview} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm cursor-grab active:cursor-grabbing group">
                          <GripVertical className="h-4 w-4 text-slate-400" />
                          <div className="relative h-12 w-12 rounded overflow-hidden bg-slate-100 flex-shrink-0">
                            <Image
                              src={preview}
                              alt="Thumb"
                              fill
                              className="object-cover"
                              style={{ WebkitUserSelect: 'none', WebkitTransform: 'translateZ(0)' }} // Safari fix
                            />
                          </div>
                          <div className="flex-1 text-xs font-medium text-slate-700 truncate">Image {index + 1}</div>
                          <Button variant="ghost" size="icon" onClick={() => removeImage(index)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </Reorder.Item>
                      ))}
                    </Reorder.Group>
                  )}

                  {imageFiles.length > 0 && (
                    <Button onClick={handleAutoFill} disabled={!isAutoFillAvailable} variant="outline" className="w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800">
                      {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {isAnalyzing ? 'Analyzing...' : 'Auto-Fill Details'}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {selectedCategory === 'Collector Cards' && (
                <EnhancedAICardGrader
                  onGradeComplete={(grade) => form.setValue('condition', grade)}
                  imageFiles={imageFiles}
                  onApplySuggestions={(res) => handleApplyAiSuggestions(res)}
                />
              )}
            </div>

            {/* RIGHT COLUMN: Form Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle>Item Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem><FormLabel>Title</FormLabel><FormControl><Input placeholder="e.g. 1999 Pokémon Charizard Holo" {...field} className="h-12 text-lg" /></FormControl><FormMessage /></FormItem>
                  )} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="category" render={({ field }) => (
                      <FormItem><FormLabel>Category</FormLabel><Select onValueChange={(val) => { field.onChange(val); form.setValue('subCategory', ''); }} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger></FormControl><SelectContent>{CATEGORIES_OPTIONS.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="condition" render={({ field }) => (
                      <FormItem><FormLabel>Condition</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger></FormControl><SelectContent>{CONDITION_OPTIONS.map((c: string) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="Tell buyers about your item..." rows={6} className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md">
                <CardHeader className="border-b border-slate-100 pb-4">
                  <CardTitle>Pricing & Delivery</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between"><FormLabel>Price (AUD)</FormLabel><Button type="button" variant="link" size="sm" onClick={() => setShowPriceLookup(true)} className="h-auto p-0 text-primary">Price Research</Button></div>
                        <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><FormControl><Input type="number" step="0.01" className="pl-9" {...field} /></FormControl></div><FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>

                  <div className="space-y-4 pt-4">
                    <FormField control={form.control} name="isVault" render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                        <div className="space-y-1">
                          <FormLabel className="flex items-center text-emerald-900 font-bold"><ShieldCheck className="h-4 w-4 mr-2 text-emerald-600" /> Secure Vault Protection</FormLabel>
                          <FormDescription className="text-emerald-700/80 text-xs">Picksy acts as the middle-man. We verify the item before payout. ($49.95 fee)</FormDescription>
                        </div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="data-[state=checked]:bg-emerald-600" /></FormControl>
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="isReverseBidding" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                          <div className="space-y-0.5"><FormLabel>Accept Offers</FormLabel><FormDescription className="text-xs">Let buyers bid.</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="autoRepricingEnabled" render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
                          <div className="space-y-0.5"><FormLabel>Smart Pricing</FormLabel><FormDescription className="text-xs">Auto-adjust price.</FormDescription></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleReview}
              disabled={isSubmitting}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-bold h-14 px-8 text-lg shadow-lg w-full md:w-auto"
            >
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
              Review Listing
            </Button>
          </div>
        </main>
      </div >

      {/* Mobile Fixed Action Bar */}
      < div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-50 md:hidden pb-safe" >
        <Button
          onClick={handleReview}
          disabled={isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-white font-bold h-12 shadow-lg"
        >
          {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Eye className="h-5 w-5 mr-2" />}
          Review Listing
        </Button>
      </div >

      <EbayPriceLookup isOpen={showPriceLookup} onClose={() => setShowPriceLookup(false)} onPriceSelect={(p) => { form.setValue('price', p); setShowPriceLookup(false); }} searchParams={{ title: form.getValues('title'), year: form.getValues('year') }} />
    </Form >
  );
}
