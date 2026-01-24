
'use client';

import { useState, useRef, ChangeEvent, useTransition, useEffect } from 'react';
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
import { Upload, Camera, Trash2, DollarSign, Package, Sparkles, Loader2, Send, GripVertical, ShieldCheck, Zap, ArrowRight, Eye, Info, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { CameraCapture } from '@/components/ui/camera-capture';
import { Reorder, motion } from 'framer-motion';
import type { Product } from '@/lib/types';
import { BeforeUnload } from '@/hooks/use-before-unload';
import EnhancedAICardGrader from '@/components/products/EnhancedAICardGrader';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { testApiKey } from '@/ai/flows/test-api-key';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import type { SuggestListingDetailsOutput } from '@/ai/flows/schemas';
import { createProductAction } from '@/app/actions/products';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { EbayPriceLookup } from '@/components/sell/EbayPriceLookup';
import { doc } from 'firebase/firestore';


const VAULT_MINIMUM_PRICE = 250;

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
  const [gradeResult, setGradeResult] = useState<SuggestListingDetailsOutput | null>(null);
  const [showPriceLookup, setShowPriceLookup] = useState(false);

  const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
  const { data: marketplaceOptions, isLoading: optionsLoading } = useDoc<any>(optionsRef);

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

  const selectedCategory = form.watch('category');
  const currentPrice = form.watch('price');
  const imageFiles = form.watch('imageFiles');
  const isVaultEligible = currentPrice >= VAULT_MINIMUM_PRICE;

  useEffect(() => {
    if (!isVaultEligible) {
      form.setValue('isVault', false);
    }
  }, [isVaultEligible, form]);

  // Load research scan data if coming from research tool
  useEffect(() => {
    if (user && !authLoading) {
      const researchData = sessionStorage.getItem('researchScanData');
      if (researchData) {
        try {
          const data = JSON.parse(researchData);

          // Prefill form fields
          if (data.title) form.setValue('title', data.title);
          if (data.description) form.setValue('description', data.description);
          if (data.category) form.setValue('category', data.category);
          if (data.subCategory) form.setValue('subCategory', data.subCategory);
          if (data.year) form.setValue('year', data.year);
          if (data.manufacturer) form.setValue('manufacturer', data.manufacturer);

          // Convert base64 image to File if available
          if (data.imageDataUri) {
            fetch(data.imageDataUri)
              .then(res => res.blob())
              .then(blob => {
                const file = new File([blob], 'scanned-card.jpg', { type: 'image/jpeg' });
                form.setValue('imageFiles', [file]);
                setImagePreviews([data.imageDataUri]);

                toast({
                  title: 'Card Data Loaded!',
                  description: 'Scanned card details have been pre-filled.',
                });
              })
              .catch(err => console.error('Failed to convert image:', err));
          }

          // Clear the session storage after loading
          sessionStorage.removeItem('researchScanData');
        } catch (err) {
          console.error('Failed to load research data:', err);
        }
      }
    }
  }, [user, authLoading, form, toast]);

  useEffect(() => {
    return () => {
      imagePreviews.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [imagePreviews]);

  const addImages = (newFiles: File[]) => {
    const currentFiles = form.getValues('imageFiles');
    if (currentFiles.length + newFiles.length > 5) {
      toast({ title: "Maximum 5 images allowed.", variant: "destructive" });
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    newFiles.forEach(file => {
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({ title: `Image ${file.name} is too large.`, variant: 'destructive' });
        return;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    });

    const updatedFiles = [...currentFiles, ...validFiles];
    form.setValue('imageFiles', updatedFiles, { shouldValidate: true });
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addImages(files);
  };

  const handlePhotoCaptured = (files: File[]) => {
    addImages(files);
  };

  const removeImage = (index: number) => {
    const currentFiles = form.getValues('imageFiles');
    const urlToRemove = imagePreviews[index];

    const updatedFiles = currentFiles.filter((_, i) => i !== index);
    form.setValue('imageFiles', updatedFiles, { shouldValidate: true });
    setImagePreviews(prev => prev.filter((_, i) => i !== index));

    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }
  };

  const handleImageReorder = (newOrder: string[]) => {
    const currentFiles = form.getValues('imageFiles');
    const reorderedFiles: File[] = [];
    newOrder.forEach(previewUrl => {
      const originalIndex = imagePreviews.indexOf(previewUrl);
      if (originalIndex > -1) {
        reorderedFiles.push(currentFiles[originalIndex]);
      }
    });

    form.setValue('imageFiles', reorderedFiles);
    setImagePreviews(newOrder);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAutoFill = async () => {
    const currentFiles = form.getValues('imageFiles');
    if (!currentFiles || currentFiles.length === 0) {
      toast({
        title: "No images found",
        description: "Please upload at least one image to use Auto-Fill.",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "You must be signed in to use AI features.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // 1. Filter for new Files (ignore existing URLs if any)
      // Only process the first 3 images to save tokens/bandwidth
      const filesToProcess = currentFiles.slice(0, 3).filter((f: any) => f instanceof File) as File[];

      if (filesToProcess.length === 0) {
        toast({
          title: "Unsupported Image Type",
          description: "Please upload new photos to use this feature.",
          variant: "destructive",
        });
        return;
      }

      // 2. Upload to Firebase Storage
      // This allows us to send small URLs to the AI instead of massive Base64 strings
      // We use a temporary path; these can be cleaned up later via lifecycle policies
      const photoUrls = await uploadImages(filesToProcess, `temp-analysis/${user.uid}`);

      // 3. Get ID Token
      const idToken = await user.getIdToken();

      // 4. Call AI Service
      const suggestions = await suggestListingDetails({
        photoDataUris: photoUrls, // Schema accepts URLs now
        title: form.getValues('title') || undefined,
        idToken,
      });

      // 5. Apply Suggestions
      handleApplyAiSuggestions(suggestions);

    } catch (error: any) {
      console.error("Auto-Fill Error:", error);
      toast({
        title: "Auto-Fill Failed",
        description: error.message || "Could not analyze images. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAiSuggestions = (result: SuggestListingDetailsOutput) => {
    if (result) {
      form.setValue('title', result.title || '', { shouldValidate: true });
      form.setValue('description', result.description || '', { shouldValidate: true });
      form.setValue('price', result.price || 0, { shouldValidate: true });
      form.setValue('category', result.category || '', { shouldValidate: true });
      if (result.subCategory && SUB_CATEGORIES[result.category]?.includes(result.subCategory)) {
        form.setValue('subCategory', result.subCategory, { shouldValidate: true });
      } else {
        form.setValue('subCategory', '', { shouldValidate: true });
      }
      form.setValue('condition', result.condition || '', { shouldValidate: true });
      form.setValue('manufacturer', result.manufacturer || '', { shouldValidate: true });
      form.setValue('year', result.year || undefined, { shouldValidate: true });
      form.setValue('cardNumber', result.cardNumber || '', { shouldValidate: true });

      form.trigger();
      toast({ title: 'AI Suggestions Applied!' });
    }
  };

  const handleReview = async () => {
    setIsSubmitting(true);
    const isValid = await form.trigger();
    if (!isValid) {
      toast({
        title: "Missing Details",
        description: "Please fill out all required fields before reviewing.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    if (!user) {
      toast({ title: "You must be signed in.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      const data = form.getValues();
      const imageFiles = data.imageFiles.filter(f => f instanceof File) as File[];
      const imageUrls = await uploadImages(imageFiles, `products/${user.uid}`);

      const listingData = { ...data, imageUrls, imageFiles: [] };

      sessionStorage.setItem('listingReviewData', JSON.stringify(listingData));
      router.push('/sell/review');

    } catch (error: any) {
      console.error("Error during review transition:", error);
      toast({
        title: "Could not proceed to review",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  const getCaptureMode = () => {
    const category = form.getValues('category');
    if (category === 'Collector Cards') return 'card';
    if (category === 'Coins') return 'coin';
    return 'default';
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin" /></div>;
  }

  if (!user && !authLoading) {
    return <div className="flex h-screen items-center justify-center"><p>Redirecting to sign-in...</p></div>;
  }

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <form onSubmit={(e) => e.preventDefault()}>
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center">
              <motion.h1
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-black text-gray-900 tracking-tight"
              >
                Pro Seller Lab
              </motion.h1>
              <p className="text-muted-foreground mt-2">Create your listing with our AI-powered tools.</p>
            </div>

            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-lg text-white">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Visual Lab</CardTitle>
                    <CardDescription>Upload up to 5 images for your listing.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6">
                  <div
                    onClick={triggerFileInput}
                    className="group w-[15%] relative rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400 cursor-pointer flex items-center justify-center text-center p-3 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <div className="bg-white p-2 rounded-md shadow-sm text-slate-500 group-hover:text-primary transition-colors">
                        <Upload className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-700 text-sm text-left">Upload from Device</h3>
                        <p className="text-xs text-muted-foreground tracking-tight text-left">Click here to select files</p>
                      </div>
                    </div>
                    <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </div>
                  <CameraCapture
                    onCapture={handlePhotoCaptured}
                    captureMode={getCaptureMode()}
                    variant="hero"
                    maxFiles={5 - imageFiles.length}
                  />
                </div>
                <FormField control={form.control} name="imageFiles" render={() => (
                  <FormItem><FormMessage /></FormItem>
                )} />
                {imagePreviews.length > 0 && (
                  <Reorder.Group axis="x" values={imagePreviews} onReorder={handleImageReorder} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <Reorder.Item key={preview} value={preview} className="relative group aspect-square">
                        <div className="absolute top-0 right-0 z-10 p-1 bg-black/50 rounded-bl-lg cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-4 h-4 text-white" />
                        </div>
                        {index === 0 && (
                          <div className="absolute bottom-0 left-0 right-0 bg-primary/80 text-white text-xs font-bold text-center py-0.5 z-10">
                            Main
                          </div>
                        )}
                        <Image src={preview} alt={`Upload ${index + 1}`} fill sizes="20vw" className="object-cover rounded-md border" />
                        <Button variant="destructive" size="icon" className="absolute top-0 left-0 h-7 w-7 opacity-0 group-hover:opacity-100 z-20" onClick={() => removeImage(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}

                {imageFiles.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleAutoFill}
                      disabled={isAnalyzing || imageFiles.length === 0}
                      variant="secondary"
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200"
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing Images...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Auto-Fill Details from Images
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {selectedCategory === 'Collector Cards' && (
              <EnhancedAICardGrader
                onGradeComplete={(grade) => form.setValue('condition', grade)}
                imageFiles={imageFiles}
                onApplySuggestions={handleApplyAiSuggestions}
              />
            )}

            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-lg text-white">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Intelligence Lab</CardTitle>
                    <CardDescription>AI-driven descriptive optimization.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 tracking-tight">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Listing Title *</FormLabel><FormControl><Input placeholder="e.g., 1999 Pokémon Charizard Holo 1st Edition" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Description *</FormLabel><FormControl><Textarea placeholder="Describe your item's condition, history, and any unique features..." rows={5} {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem><FormLabel>Category *</FormLabel><Select onValueChange={(value) => { field.onChange(value); form.setValue('subCategory', ''); }} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a main category" /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES_OPTIONS.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  {selectedCategory && SUB_CATEGORIES[selectedCategory] && (
                    <FormField control={form.control} name="subCategory" render={({ field }) => (
                      <FormItem><FormLabel>Sub-Category</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!selectedCategory}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a sub-category" /></SelectTrigger></FormControl>
                        <SelectContent>{(SUB_CATEGORIES[selectedCategory] || []).map((cat: string) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
                      </Select><FormMessage /></FormItem>
                    )} />
                  )}
                  <FormField control={form.control} name="condition" render={({ field }) => (
                    <FormItem><FormLabel>Condition *</FormLabel><Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select condition" /></SelectTrigger></FormControl>
                      <SelectContent>{CONDITION_OPTIONS.map((opt: string) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                  )} />
                  {selectedCategory === 'Collector Cards' && (
                    <>
                      <FormField control={form.control} name="manufacturer" render={({ field }) => (
                        <FormItem><FormLabel>Manufacturer</FormLabel><FormControl><Input placeholder="e.g., Topps, Wizards of the Coast" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="year" render={({ field }) => (
                        <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 1999" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="cardNumber" render={({ field }) => (
                        <FormItem><FormLabel>Card Number</FormLabel><FormControl><Input placeholder="e.g., 4/102" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </>
                  )}
                  {selectedCategory === 'Coins' && (
                    <>
                      <FormField control={form.control} name="manufacturer" render={({ field }) => (
                        <FormItem><FormLabel>Mint</FormLabel><FormControl><Input placeholder="e.g., US Mint, Perth Mint" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="year" render={({ field }) => (
                        <FormItem><FormLabel>Year</FormLabel><FormControl><Input type="number" placeholder="e.g., 1909" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                      )} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="bg-primary p-2 rounded-lg text-white">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>Market Hub</CardTitle>
                    <CardDescription>Set your price and selling options.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Price (AUD) *</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={() => setShowPriceLookup(true)} disabled={!form.getValues('title')}>
                        <TrendingUp className="mr-2 h-4 w-4" /> Research Pricing
                      </Button>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                      <FormControl><Input type="number" step="0.01" placeholder="0.00" className="pl-9" {...field} onFocus={(e) => e.target.select()} /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>Quantity *</FormLabel><FormControl><Input type="number" min="1" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="isReverseBidding" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5"><FormLabel>Accept Offers</FormLabel><FormDescription className="text-xs">Allow buyers to place bids on your item.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="autoRepricingEnabled" render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5"><FormLabel>Enable Auto-Repricing</FormLabel><FormDescription className="text-xs">Automatically adjust price based on views and market conditions.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isVault" render={({ field }) => (
                  <FormItem className={cn("flex items-center justify-between rounded-lg border p-3", !isVaultEligible && "bg-muted/50")}>
                    <div className="space-y-0.5">
                      <FormLabel className={cn("flex items-center", !isVaultEligible && "text-muted-foreground")}>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Picksy Vault
                      </FormLabel>
                      <FormDescription className="text-xs">
                        {isVaultEligible ? "Use our secure escrow and verification service." : `Available for items over $${VAULT_MINIMUM_PRICE}.`}
                      </FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} disabled={!isVaultEligible} /></FormControl>
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4 pt-4">
              <Button
                type="button"
                onClick={handleReview}
                disabled={isSubmitting}
                size="lg"
                className="h-14 rounded-xl bg-primary hover:bg-primary/90 text-lg font-bold group"
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Eye className="mr-2 h-5 w-5" />
                )}
                Review Listing
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        </main>
      </form>
      <EbayPriceLookup
        isOpen={showPriceLookup}
        onClose={() => setShowPriceLookup(false)}
        onPriceSelect={(price) => {
          form.setValue('price', price);
          setShowPriceLookup(false);
        }}
        searchParams={{
          title: form.getValues('title'),
          year: form.getValues('year'),
        }}
      />
    </Form>
  );
}
