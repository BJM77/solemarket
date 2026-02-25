'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { BeforeUnload } from '@/hooks/use-before-unload';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { getDraftListing, saveDraftListing } from '@/app/actions/sell';
import { doc } from 'firebase/firestore';
import imageCompression from 'browser-image-compression';
import { MARKETPLACE_CATEGORIES } from '@/config/categories';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ChevronLeft, ChevronRight, Eye, Loader2, Save } from 'lucide-react';
import { WizardProgress } from '@/components/sell/wizard/WizardProgress';
import { ListingTypeStep } from '@/components/sell/wizard/ListingTypeStep';
import { ImageUploadStep } from '@/components/sell/wizard/ImageUploadStep';
import { DetailsStep } from '@/components/sell/wizard/DetailsStep';
import { PricingAndDeliveryStep } from '@/components/sell/wizard/PricingAndDeliveryStep';

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
  imageFiles: z.array(z.any()).default([]),
  // Benched Specs
  brand: z.string().optional(),
  model: z.string().optional(), // For internal use or future
  size: z.string().optional(),
  styleCode: z.string().optional(),
  colorway: z.string().optional(),
  color: z.string().optional(),
  year: z.coerce.number().optional(),
  material: z.string().optional(),
  hasOtherBrand: z.boolean().default(false),
  // Multibuy
  multibuyEnabled: z.boolean().default(false),
  multibuyTiers: z.array(z.object({
    minQuantity: z.coerce.number().min(2),
    discountPercent: z.coerce.number().min(1).max(100),
  })).optional(),
  acceptsPayId: z.boolean().default(false),
});

type ListingFormValues = z.infer<typeof formSchema>;

const STEPS = ['Type', 'Photos', 'Details', 'Pricing'];

import { Suspense } from 'react';

// Main component that uses searchParams
function CreateListingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<'sneakers' | 'trading-cards' | null>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
  const { data: marketplaceOptions } = useDoc<any>(optionsRef);

  // Derive subcategories from config
  const SUB_CATEGORIES: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};
    MARKETPLACE_CATEGORIES.forEach(cat => {
      map[cat.name] = cat.subcategories?.map(sub => sub.name) || [];
    });
    return map;
  }, []);

  const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || ['New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'];

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
      isNegotiable: false,
      autoRepricingEnabled: false,
      imageFiles: [],
      brand: '',
      model: '',
      size: '',
      styleCode: '',
      colorway: '',
      color: '',
      year: '' as any,
      material: '',
      hasOtherBrand: false,
      multibuyEnabled: false,
      multibuyTiers: [],
      acceptsPayId: false,
    },
  });

  const imageFiles = form.watch('imageFiles');

  // Initialize from persistence/URL
  useEffect(() => {
    // 1. Check URL for pre-fill data (from Scanner)
    const title = searchParams.get('title');
    if (title && !editId) {
      // Pre-fill from URL
      form.reset({
        title: title || '',
        category: searchParams.get('category') || 'Sneakers',
        brand: searchParams.get('brand') || '',
        model: searchParams.get('model') || '',
        styleCode: searchParams.get('styleCode') || '',
        colorway: searchParams.get('colorway') || '',
        size: searchParams.get('size') || '',
        condition: searchParams.get('condition') || '',
        description: searchParams.get('description') || '',
        // Defaults
        price: 0,
        quantity: 1,
        imageFiles: [],
      });
      setSelectedType('sneakers');
      setCurrentStep(1); // Jump to Photos
      return;
    }

    // 2. Load draft if editId exists
    if (!user || !editId) {
      // Recover persistent type if no editId
      const storedType = localStorage.getItem('preferredListingType') as 'sneakers' | null;
      if (storedType) {
        setSelectedType(storedType);
        setCurrentStep(1);
      }
      return;
    }

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const data = await getDraftListing(editId, user.uid);
        if (data) {
          form.reset({
            ...data,
            imageFiles: data.imageUrls || [],
            price: Number(data.price),
            quantity: Number(data.quantity),
            year: data.year ? Number(data.year) : undefined,
          });
          setImagePreviews(data.imageUrls || []);

          // Infer type
          if (data.category === 'Sneakers') setSelectedType('sneakers');
          else if (data.category === 'Trading Cards') setSelectedType('trading-cards');

          setCurrentStep(1); // Jump to photos on draft load
        }
      } catch (e) {
        console.error(e);
        toast({ title: "Error loading draft", variant: "destructive" });
      } finally {
        setIsLoadingDraft(false);
      }
    };
    loadDraft();
  }, [editId, user, form, toast, searchParams]);

  // Handle Type Selection
  const handleTypeSelect = (type: 'sneakers' | 'trading-cards') => {
    setSelectedType(type);
    localStorage.setItem('preferredListingType', type);
    form.setValue('category', type === 'sneakers' ? 'Sneakers' : 'Trading Cards');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImagesChange = (newFiles: File[], newPreviews: string[]) => {
    const currentFiles = form.getValues('imageFiles');
    form.setValue('imageFiles', [...currentFiles, ...newFiles], { shouldValidate: true });
    setImagePreviews(prev => [...prev, ...newPreviews]);
  };

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
      const suggestions = await suggestListingDetails({ photoDataUris: allUrls, title: form.getValues('title') || undefined, category: form.getValues('category'), idToken });
      if (suggestions) {
        Object.entries(suggestions).forEach(([key, value]) => { if (value) form.setValue(key as any, value); });
        toast({ title: '✨ AI Magic Applied!', description: 'Details have been auto-filled.' });
      }
    } catch (error: any) {
      toast({ title: "Auto-Fill Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate: any[] = [];
    if (currentStep === 1) { // Photos
      // Enforce at least 1 photo before proceeding
      if (imageFiles.length === 0) {
        toast({
          title: "Photos Required",
          description: "Please upload at least one photo of your item to proceed.",
          variant: "destructive"
        });
        return;
      }
    } else if (currentStep === 2) { // Details
      // Validate everything that is shown on Step 2
      fieldsToValidate.push(
        'title', 'category', 'condition', 'brand', 'size', 'description',
        'styleCode', 'colorway', 'year', 'gradingCompany', 'grade', 'certNumber', 'cardNumber'
      );
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      // Final Step: Review/Submit
      await handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({ title: "Please check all fields", variant: "destructive" });
        setIsSubmitting(false);
        return;
      }
      if (!user) {
        toast({ title: "You must be logged in", variant: "destructive" });
        return;
      }

      const values = form.getValues();
      const currentFiles = values.imageFiles;
      const newFiles = currentFiles.filter((f: any) => f instanceof File) as File[];
      const existingUrls = currentFiles.filter((f: any) => typeof f === 'string') as string[];

      let finalUrls = existingUrls;
      if (newFiles.length > 0) {
        const uploaded = await uploadImages(newFiles, `products/${user.uid}`);
        finalUrls = [...existingUrls, ...uploaded];
      }

      const { imageFiles, ...rest } = values;
      const listingData = {
        ...rest,
        imageUrls: finalUrls,
        category: values.category || 'Sneakers',
        isVault: false,
      };

      const draftId = await saveDraftListing(user.uid, listingData, editId || undefined);

      toast({ title: "Draft Saved", description: "Proceeding to review..." });
      router.push(`/sell/review?draftId=${draftId}`);

    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingDraft) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Step 0: Type Selection (Full Screen)
  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <ListingTypeStep onSelect={handleTypeSelect} selectedType={selectedType} />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <div className="bg-slate-50 dark:bg-background min-h-screen pb-32">
        {/* Header */}
        <div className="bg-white dark:bg-card border-b border-slate-200 dark:border-border sticky top-0 z-30 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={prevStep}><ChevronLeft className="h-5 w-5" /></Button>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                {currentStep === 1 ? 'Upload Photos' : currentStep === 2 ? 'Details' : 'Pricing & Review'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Step {currentStep} of 3</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="container mx-auto px-4 pb-0">
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 pb-48 max-w-3xl">
          {currentStep === 1 && (
            <ImageUploadStep
              imageFiles={imageFiles}
              imagePreviews={imagePreviews}
              onImagesChange={handleImagesChange}
              onRemoveImage={removeImage}
              onAutoFill={handleAutoFill}
              isAnalyzing={isAnalyzing}
              selectedType={selectedType || 'sneakers'}
              onGradeComplete={(grade) => form.setValue('condition', grade)}
              onApplySuggestions={(res) => { Object.entries(res).forEach(([k, v]) => { if (v) form.setValue(k as any, v) }); }}
              form={form}
            />
          )}

          {currentStep === 2 && (
            <DetailsStep
              form={form}
              selectedType={selectedType || 'sneakers'}
              subCategories={SUB_CATEGORIES}
              conditionOptions={CONDITION_OPTIONS}
              onAutoFill={handleAutoFill}
              isAnalyzing={isAnalyzing}
              imageFiles={imageFiles}
            />
          )}

          {currentStep === 3 && (
            <PricingAndDeliveryStep form={form} />
          )}
        </main>

        {/* Floating Footer Navigation */}
        <div className="fixed bottom-[80px] md:bottom-0 left-0 right-0 p-4 bg-white dark:bg-card border-t border-slate-200 dark:border-border z-50 safe-area-pb shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
          <div className="max-w-3xl mx-auto flex gap-4">
            <Button variant="outline" size="lg" className="flex-1 rounded-xl h-14" onClick={prevStep}>
              Back
            </Button>
            <Button size="lg" className="flex-[2] font-bold text-lg rounded-xl h-14" onClick={nextStep} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              {currentStep === 3 ? (
                <>
                  <Eye className="mr-2 h-5 w-5" /> Review Listing
                </>
              ) : (
                <>
                  Next <ChevronRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Form>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CreateListingForm />
    </Suspense>
  );
}

