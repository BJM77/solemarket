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
  // Multibuy
  multibuyEnabled: z.boolean().default(false),
  multibuyTiers: z.array(z.object({
    minQuantity: z.coerce.number().min(2),
    discountPercent: z.coerce.number().min(1).max(100),
  })).optional(),
  multiCardTier: z.string().optional(),
});

type ListingFormValues = z.infer<typeof formSchema>;

const STEPS = ['Type', 'Photos', 'Details', 'Pricing'];

export default function CreateListingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<'cards' | 'coins' | 'general' | null>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
  const { data: marketplaceOptions } = useDoc<any>(optionsRef);

  const SUB_CATEGORIES: Record<string, string[]> = {
    'Collector Cards': marketplaceOptions?.subCategories?.collector_cards || ['Sports Cards', 'Trading Cards'],
    'Coins': marketplaceOptions?.subCategories?.coins || ['Coins', 'World Coins', 'Ancient Coins', 'Bullion'],
    'Collectibles': marketplaceOptions?.subCategories?.collectibles || ['Stamps', 'Comics', 'Figurines', 'Toys', 'Shoes', 'Memorabilia'],
    'General': marketplaceOptions?.subCategories?.general || ['Household', 'Electronics', 'Clothing', 'Books', 'Other']
  };
  const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || ['Mint', 'Near Mint', 'Excellent', 'Good', 'Fair', 'Poor'];

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
      isVault: false,
      imageFiles: [],
      year: '' as any,
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
      multibuyEnabled: false,
      multibuyTiers: [],
      multiCardTier: '',
    },
  });

  const imageFiles = form.watch('imageFiles');

  // Initialize from persistence/URL
  useEffect(() => {
    // 1. Check URL for step/type overrides if needed (optional)
    // 2. Load draft if editId exists
    if (!user || !editId) {
      // Recover persistent type if no editId
      const storedType = localStorage.getItem('preferredListingType') as 'cards' | 'coins' | 'general' | null;
      if (storedType) {
        setSelectedType(storedType);
        setCurrentStep(1); // Skip to photos if type is known
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
          if (data.category === 'Collector Cards') setSelectedType('cards');
          else if (data.category === 'Coins') setSelectedType('coins');
          else setSelectedType('general');

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
  }, [editId, user, form, toast]);

  // Handle Type Selection
  const handleTypeSelect = (type: 'cards' | 'coins' | 'general') => {
    setSelectedType(type);
    localStorage.setItem('preferredListingType', type);
    // Set default category
    const cat = type === 'cards' ? 'Collector Cards' : type === 'coins' ? 'Coins' : 'General';
    form.setValue('category', cat);
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
        // Optional: Auto-advance if confidence is high? For now, stay to let user verify.
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
      // Could enforce min 1 photo
    } else if (currentStep === 2) { // Details
      fieldsToValidate.push('title', 'category', 'condition');
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
        category: values.category || (selectedType === 'cards' ? 'Collector Cards' : selectedType === 'coins' ? 'Coins' : 'General'),
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <ListingTypeStep onSelect={handleTypeSelect} selectedType={selectedType} />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <div className="bg-slate-50 min-h-screen pb-32">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={prevStep}><ChevronLeft className="h-5 w-5" /></Button>
              <h1 className="text-lg font-bold text-slate-900">
                {currentStep === 1 ? 'Upload Photos' : currentStep === 2 ? 'Details' : 'Pricing & Review'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500">Step {currentStep} of 3</span>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="container mx-auto px-4 pb-0">
            <div className="h-1 w-full bg-slate-100">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(currentStep / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          {currentStep === 1 && (
            <ImageUploadStep
              imageFiles={imageFiles}
              imagePreviews={imagePreviews}
              onImagesChange={handleImagesChange}
              onRemoveImage={removeImage}
              onAutoFill={handleAutoFill}
              isAnalyzing={isAnalyzing}
              selectedType={selectedType || 'general'}
              onGradeComplete={(grade) => form.setValue('condition', grade)}
              onApplySuggestions={(res) => { Object.entries(res).forEach(([k, v]) => { if (v) form.setValue(k as any, v) }); }}
              form={form}
            />
          )}

          {currentStep === 2 && (
            <DetailsStep
              form={form}
              selectedType={selectedType || 'general'}
              subCategories={SUB_CATEGORIES}
              conditionOptions={CONDITION_OPTIONS}
            />
          )}

          {currentStep === 3 && (
            <PricingAndDeliveryStep form={form} />
          )}
        </main>

        {/* Floating Footer Navigation */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 z-40 safe-area-pb">
          <div className="max-w-3xl mx-auto flex gap-4">
            <Button variant="outline" size="lg" className="flex-1" onClick={prevStep}>
              Back
            </Button>
            <Button size="lg" className="flex-[2] font-bold text-lg" onClick={nextStep} disabled={isSubmitting}>
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

