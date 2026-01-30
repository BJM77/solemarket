'use client';

import { useState, useRef, ChangeEvent, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Upload, Trash2, DollarSign, Sparkles, Loader2, GripVertical, ShieldCheck, Eye, ImagePlus, ChevronLeft } from 'lucide-react';
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
import { getDraftListing, saveDraftListing } from '@/app/actions/sell';

// ... existing imports

export default function CreateListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const listingType = searchParams.get('type') as 'cards' | 'coins' | 'general' | null;

  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user, isUserLoading: authLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(!!editId);
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
      quantity: 1,
      isReverseBidding: false,
      autoRepricingEnabled: false,
      isVault: false,
      imageFiles: [],
      // Reset all specs
      year: undefined,
      manufacturer: '',
      cardNumber: '',
      grade: '',
      gradingCompany: '',
      certNumber: '',
      denomination: '',
      mintMark: '',
      country: '',
      metal: '',
      purity: '',
      weight: '',
      dimensions: '',
      material: '',
      authentication: '',
      authenticationNumber: '',
      signer: '',
    },
  });

  // Load existing data if editing
  useEffect(() => {
    if (editId && user && !form.getValues('title')) { // Only load if not already loaded (simple check)
      setIsLoadingDraft(true);
      getDraftListing(editId, user.uid)
        .then((data) => {
          if (data) {
            // Determine type from category
            let type: 'cards' | 'coins' | 'general' = 'general';
            if (data.category === 'Collector Cards') type = 'cards';
            else if (data.category === 'Coins') type = 'coins';

            // If type param is missing or wrong, redirect to correct type url to ensure rendering
            if (listingType !== type) {
              const newParams = new URLSearchParams(searchParams.toString());
              newParams.set('type', type);
              router.replace(`/sell/create?${newParams.toString()}`);
              return;
            }

            // Populate form
            // Ensure date/numbers are correctly typed
            const formData = {
              ...data,
              price: Number(data.price),
              quantity: Number(data.quantity || 1),
              year: data.year ? Number(data.year) : undefined,
              imageFiles: data.imageUrls || [], // existing URLs
            };

            form.reset(formData);
            setImagePreviews(data.imageUrls || []);
          }
        })
        .catch(error => {
          console.error(error);
          toast({ title: "Error loading listing", description: error.message, variant: "destructive" });
        })
        .finally(() => setIsLoadingDraft(false));
    }
  }, [editId, user, listingType, router, searchParams, form, toast]);


  // Set default category based on listing type (Only if not editing or empty)
  useEffect(() => {
    const currentCat = form.getValues('category');
    if (!currentCat) {
      if (listingType === 'cards') form.setValue('category', 'Collector Cards');
      else if (listingType === 'coins') form.setValue('category', 'Coins');
      else if (listingType === 'general') form.setValue('category', 'Memorabilia');
    }
  }, [listingType, form]);

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
      // If no new files, use existing URLs? suggestListingDetails might need dataURIs/remote URLs.
      // Assuming uploadImages handles it or we pass existing URLs?
      // uploadImages returns URLs.

      let photoUrls: string[] = [];
      if (filesToProcess.length > 0) {
        photoUrls = await uploadImages(filesToProcess, `temp-analysis/${user.uid}`);
      }

      // Also include existing URLs
      const existingUrls = currentFiles.filter((f: any) => typeof f === 'string') as string[];
      const allUrls = [...existingUrls, ...photoUrls];

      if (allUrls.length === 0) return;

      const idToken = await user.getIdToken();
      // suggestListingDetails might expecting data URIs? Or URLs?
      // The implementation usually handles public URLs.

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

  const handleReview = async () => {
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

      const draftId = await saveDraftListing(user.uid, {
        ...cleanData,
        imageUrls: finalImageUrls
      }, editId || undefined);

      router.push(`/sell/review?draftId=${draftId}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingDraft) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  if (!user) return null;

  if (!listingType) {
    return (
      <div className="min-h-screen bg-slate-50 py-20 px-4">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">What are you selling today?</h1>
            <p className="text-slate-500 text-lg">Choose a category to get started with a tailored listing experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { id: 'cards', title: 'Trading Cards', icon: '🎴', desc: 'Sports, TCG, Non-sports cards', ratio: '5:7' },
              { id: 'coins', title: 'Coins & Currency', icon: '🪙', desc: 'Rare coins, Bullion, Banknotes', ratio: '1:1' },
              { id: 'general', title: 'Memorabilia', icon: '🏆', desc: 'Signed items, Antiques, Shoes', ratio: '16:9' }
            ].map((item) => (
              <Card key={item.id} className="group relative overflow-hidden border-2 border-transparent hover:border-primary hover:shadow-2xl transition-all cursor-pointer bg-white" onClick={() => router.push(`/sell/create?type=${item.id}`)}>
                <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
                  <div className="text-6xl group-hover:scale-110 transition-transform">{item.icon}</div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-900">{item.title}</h2>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 px-3 py-1 font-mono text-[10px]">Ratio {item.ratio}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const captureMode = listingType === 'cards' ? 'card' : listingType === 'coins' ? 'coin' : 'general';

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <div className="bg-slate-50 min-h-screen pb-20">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/sell/create')}><ChevronLeft className="h-5 w-5" /></Button>
              <h1 className="text-xl font-bold text-slate-900">List {listingType === 'cards' ? 'a Card' : listingType === 'coins' ? 'a Coin' : 'Memorabilia'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleReview} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-white font-semibold">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Review
              </Button>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-md">
                <CardHeader className="bg-slate-900 text-white p-5">
                  <CardTitle className="text-lg flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Photos</CardTitle>
                  <CardDescription className="text-slate-400">Target ratio: {listingType === 'cards' ? '5:7' : listingType === 'coins' ? '1:1' : '16:9'}</CardDescription>
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
                <CardHeader><CardTitle>Price & Quantity</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem><FormLabel>Price (AUD)</FormLabel><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><FormControl><Input type="number" step="0.01" className="pl-9" {...field} /></FormControl></div><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="quantity" render={({ field }) => (
                    <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" min="1" {...field} /></FormControl></FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </Form>
  );
}
