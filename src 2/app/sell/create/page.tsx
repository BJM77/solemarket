'use client';

import Image from 'next/image';

import { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { BeforeUnload } from '@/hooks/use-before-unload';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { getDraftListing, saveDraftListing, publishListing } from '@/app/actions/seller/sell';
import { doc } from 'firebase/firestore';
import { withRetry } from '@/ai/utils/retry';
import { MARKETPLACE_CATEGORIES } from '@/config/categories';
import { resizeAndCompressImage, processListingImages } from '@/lib/utils';
import { saveListingImagesCache, getListingImagesCache, clearListingImagesCache } from '@/lib/indexeddb';

import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { ChevronLeft, ChevronRight, Eye, Loader2, Sparkles, CheckCircle2, Send, Package, ImagePlus, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
  allowLocalPickup: z.boolean().default(true),
  imageFiles: z.array(z.any()).default([]),
  // Benched Specs
  brand: z.string().optional(),
  model: z.string().optional(),
  size: z.string().optional(),
  styleCode: z.string().optional(),
  colorway: z.string().optional(),
  color: z.string().optional(),
  year: z.coerce.number().optional(),
  material: z.string().optional(),
  hasOtherBrand: z.boolean().default(false),
  // Graded & Cards specs
  gradingCompany: z.string().optional(),
  grade: z.string().optional(),
  certNumber: z.string().optional(),
  cardNumber: z.string().optional(),
  // Multibuy
  multibuyEnabled: z.boolean().default(false),
  multiCardTier: z.string().optional(),
  multibuyTiers: z.array(z.object({
    minQuantity: z.coerce.number().min(2),
    discountPercent: z.coerce.number().min(1).max(100),
  })).optional(),
  acceptsPayId: z.boolean().default(false),
  // Gamified Dutch Auction
  isDutchAuction: z.boolean().default(false),
  dutchAuctionDropAmount: z.coerce.number().optional(),
  dutchAuctionIntervalHours: z.coerce.number().optional(),
  dutchAuctionFloorPrice: z.coerce.number().optional(),
  dutchAuctionStartTime: z.any().optional(),
  imageAltTexts: z.array(z.string()).optional(),
  seoDescription: z.string().optional(),
});

type ListingFormValues = z.infer<typeof formSchema>;

const STEPS = ['Type', 'Item Description', 'Pricing'];

// Main component that uses searchParams
function CreateListingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const [currentStep, setCurrentStep] = useState(0);
  const [selectedType, setSelectedType] = useState<'sneakers' | 'collector-cards' | 'coins' | null>(null);

  const { toast } = useToast();
  const { user } = useUser();
  const { firestore } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [suggestedFields, setSuggestedFields] = useState<string[]>([]);
  const [analysisStage, setAnalysisStage] = useState<string>('');

  // Performance Optimization: Cache pre-processed base64 images for Gemini vision calls
  const [imageFilesBase64, setImageFilesBase64] = useState<string[]>([]);
  
  // UX Optimizations: Track undo history snapshots and active backfilling fields
  const [formHistory, setFormHistory] = useState<ListingFormValues[]>([]);
  const [analyzingFields, setAnalyzingFields] = useState<Record<string, boolean>>({});
  
  const [pendingAlternatives, setPendingAlternatives] = useState<any[]>([]);
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [pendingAiData, setPendingAiData] = useState<any>(null);
  const [previousTitle, setPreviousTitle] = useState<string>('');
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryHint, setRetryHint] = useState('');

  const optionsRef = useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'marketplace_options') : null, [firestore]);
  const { data: marketplaceOptions } = useDoc<any>(optionsRef);

  // Derive subcategories from config and database
  const SUB_CATEGORIES: Record<string, string[]> = useMemo(() => {
    const map: Record<string, string[]> = {};
    
    // 1. Load from static config
    MARKETPLACE_CATEGORIES.forEach(cat => {
      map[cat.name] = cat.subcategories?.map(sub => sub.name) || [];
    });

    // 2. Merge from dynamic database options
    if (marketplaceOptions?.subCategories) {
      Object.entries(marketplaceOptions.subCategories).forEach(([catName, subs]) => {
        const existing = map[catName] || [];
        const dynamicSubs = subs as string[];
        map[catName] = Array.from(new Set([...existing, ...dynamicSubs]));
      });
    }
    
    return map;
  }, [marketplaceOptions]);

  const CONDITION_OPTIONS: string[] = marketplaceOptions?.conditions || ['New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'];

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      price: 0,
      category: '',
      subCategory: '',
      condition: 'Used',
      quantity: 1,
      isReverseBidding: false,
      isNegotiable: true,
      autoRepricingEnabled: false,
      isVault: false,
      allowLocalPickup: true,
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
      gradingCompany: '',
      grade: '',
      certNumber: '',
      cardNumber: '',
      multibuyEnabled: false,
      multibuyTiers: [],
      acceptsPayId: true,
      isDutchAuction: false,
      dutchAuctionDropAmount: 5,
      dutchAuctionIntervalHours: 24,
      dutchAuctionFloorPrice: 0,
      imageAltTexts: [],
      seoDescription: '',
    },
  });

  const isTradingCard = form.watch('category') === 'Collector Cards';

  const imageFiles = form.watch('imageFiles');
  const formValues = form.watch();

  const initializedDraftIdRef = useRef<string | null>(null);

  // Cache local image files to IndexedDB whenever they change
  useEffect(() => {
    if (!editId) return;
    const localFiles = imageFiles.filter(f => f instanceof File || f instanceof Blob) as File[];
    saveListingImagesCache(editId, localFiles);
  }, [imageFiles, editId]);

  // Background Autosave
  useEffect(() => {
    if (!user || currentStep === 0 || isSubmitting) return;

    const autosaveTimer = setTimeout(async () => {
      const { imageFiles, ...rest } = form.getValues();

      // Sanitize data: remove undefined values and ensure serializability
      const sanitizedDraft: any = JSON.parse(JSON.stringify({
        ...rest,
        status: 'draft',
      }));

      const nonBlobPreviews = imagePreviews.filter(p => !p.startsWith('blob:'));
      if (nonBlobPreviews.length > 0) {
        sanitizedDraft.imageUrls = nonBlobPreviews;
      }

      const draftData = sanitizedDraft;

      try {
        const draftId = await saveDraftListing(user.uid, draftData, editId || undefined);
        if (draftId && draftId !== editId) {
          initializedDraftIdRef.current = draftId;
          router.replace(`/sell/create?edit=${draftId}`, { scroll: false });
        }
      } catch (e) {
        console.warn("Autosave failed", e);
      }
    }, 5000);

    return () => clearTimeout(autosaveTimer);
  }, [formValues, user, currentStep, imagePreviews, editId, isSubmitting, form, router]);

  // Initialize from persistence/URL
  useEffect(() => {
    // 1. Check URL for pre-fill data (from Scanner)
    const title = searchParams.get('title');
    if (title && !editId) {
      form.reset({
        title: title || '',
        category: searchParams.get('category') || 'Sneakers',
        brand: searchParams.get('brand') || '',
        model: searchParams.get('model') || '',
        styleCode: searchParams.get('styleCode') || '',
        colorway: searchParams.get('colorway') || '',
        size: searchParams.get('size') || '',
        condition: searchParams.get('condition') || 'Used',
        description: searchParams.get('description') || '',
        price: 0,
        quantity: 1,
        imageFiles: [],
        acceptsPayId: true,
      });
      setSelectedType('sneakers');
      setCurrentStep(1);
      return;
    }

    // Prevent re-initialization if already loaded
    if (editId && initializedDraftIdRef.current === editId) {
      return;
    }

    // 2. Load draft if editId exists
    if (!user || !editId) {
      const storedType = localStorage.getItem('preferredListingType') as 'sneakers' | 'collector-cards' | 'coins' | null;
      if (storedType) {
        setSelectedType(storedType);
        form.setValue('category', storedType === 'sneakers' ? 'Sneakers' : storedType === 'coins' ? 'Coins' : 'Collector Cards', { shouldValidate: true });
      }
      return;
    }

    const loadDraft = async () => {
      setIsLoadingDraft(true);
      try {
        const data = await getDraftListing(editId, user.uid);
        if (data) {
          initializedDraftIdRef.current = editId;
          
          form.reset({
            ...data,
            imageFiles: data.imageUrls || [],
            price: Number(data.price),
            quantity: Number(data.quantity),
            year: data.year ? Number(data.year) : undefined,
          });

          // Recover local image files from IndexedDB cache if available
          const cachedFiles = await getListingImagesCache(editId);
          if (cachedFiles && cachedFiles.length > 0) {
            const localPreviews = cachedFiles.map(f => URL.createObjectURL(f));
            const combinedPreviews = [...(data.imageUrls || []), ...localPreviews];
            setImagePreviews(combinedPreviews);

            const combinedFiles = [...(data.imageUrls || []), ...cachedFiles];
            form.setValue('imageFiles', combinedFiles, { shouldValidate: true });

            // Restore base64 representations for AI
            const base64Promises = cachedFiles.map(f => new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(f);
            }));
            const base64s = await Promise.all(base64Promises);
            setImageFilesBase64(base64s);
          } else {
            setImagePreviews(data.imageUrls || []);
          }

          // Infer type
          if (data.category === 'Sneakers') setSelectedType('sneakers');
          else if (data.category === 'Coins') setSelectedType('coins');
          else if (data.category === 'Collector Cards') setSelectedType('collector-cards');

          setCurrentStep(1);
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

  // Restores the snapshot of form values prior to the last AI overwrite
  const undoLastAIAction = useCallback(() => {
    if (formHistory.length === 0) return;
    const previousSnapshot = formHistory[formHistory.length - 1];
    setFormHistory(prev => prev.slice(0, -1));

    Object.entries(previousSnapshot).forEach(([key, value]) => {
      form.setValue(key as any, value);
    });

    setTimeout(() => {
      form.trigger();
      toast({ title: '✨ AI Magic Un-done!', description: 'Your previous form entries have been restored.' });
    }, 100);
  }, [formHistory, form, toast]);

  // Handle Type Selection
  const handleTypeSelect = (type: 'sneakers' | 'collector-cards' | 'coins') => {
    setSelectedType(type);
    localStorage.setItem('preferredListingType', type);
    form.setValue('category', type === 'sneakers' ? 'Sneakers' : type === 'coins' ? 'Coins' : 'Collector Cards');
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRotateImage = (index: number) => {
    const currentFiles = form.getValues('imageFiles') as File[];
    const file = currentFiles[index];
    if (!file) return;

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob((blob) => {
        if (blob) {
          const rotatedFile = new File([blob], file.name || `rotated_${Date.now()}.jpg`, { type: 'image/jpeg' });
          const newUrl = URL.createObjectURL(rotatedFile);

          const canvasAI = document.createElement('canvas');
          const aiMaxWidth = 800;
          let wAI = canvas.width;
          let hAI = canvas.height;
          if (wAI > aiMaxWidth || hAI > aiMaxWidth) {
            if (wAI > hAI) {
              hAI = (aiMaxWidth / wAI) * hAI;
              wAI = aiMaxWidth;
            } else {
              wAI = (aiMaxWidth / hAI) * wAI;
              hAI = aiMaxWidth;
            }
          }
          canvasAI.width = wAI;
          canvasAI.height = hAI;
          const ctxAI = canvasAI.getContext('2d');
          ctxAI?.drawImage(canvas, 0, 0, wAI, hAI);
          const base64ForAI = canvasAI.toDataURL('image/jpeg', 0.6);

          const updatedFiles = [...currentFiles];
          updatedFiles[index] = rotatedFile;
          form.setValue('imageFiles', updatedFiles, { shouldValidate: true });

          setImagePreviews(prev => {
            const next = [...prev];
            if (next[index]?.startsWith('blob:')) URL.revokeObjectURL(next[index]);
            next[index] = newUrl;
            return next;
          });

          setImageFilesBase64(prev => {
            const next = [...prev];
            next[index] = base64ForAI;
            return next;
          });

          toast({ title: 'Image rotated 90°', duration: 1500 });
        }
      }, 'image/jpeg', 0.8);
    };
    img.src = imagePreviews[index];
  };

  const handleImagesChange = (newFiles: File[], newPreviews: string[], base64s?: string[]) => {
    const currentFiles = form.getValues('imageFiles');
    const updatedFiles = [...currentFiles, ...newFiles];
    form.setValue('imageFiles', updatedFiles, { shouldValidate: true });
    setImagePreviews(prev => [...prev, ...newPreviews]);
    if (base64s) {
      setImageFilesBase64(prev => [...prev, ...base64s]);
    }

    // PROACTIVE AI: Trigger analysis if we have enough images and fields are empty
    if (updatedFiles.length >= 2 && !form.getValues('title')) {
      handleAutoFill();
    }
  };

  const removeImage = (index: number) => {
    const currentFiles = form.getValues('imageFiles');
    const urlToRemove = imagePreviews[index];
    form.setValue('imageFiles', currentFiles.filter((_, i) => i !== index), { shouldValidate: true });
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFilesBase64(prev => prev.filter((_, i) => i !== index));
    if (urlToRemove && urlToRemove.startsWith('blob:')) URL.revokeObjectURL(urlToRemove);
  };

  const handleAutoFill = async (searchHint?: string) => {
    const currentFiles = form.getValues('imageFiles');
    if (!currentFiles.length || !user || isAnalyzing) return;
    setIsAnalyzing(true);

    // Save snapshot for Undo recovery
    const currentFormValues = form.getValues();
    const snapshot = JSON.parse(JSON.stringify({
      ...currentFormValues,
      imageFiles: currentFormValues.imageFiles
    }));
    setFormHistory(prev => [...prev, snapshot]);

    // Track fields as analyzing to show shimmer skeletons (Optimistic UI backfill)
    const aiFields = ['title', 'description', 'brand', 'model', 'condition', 'price', 'year', 'size', 'styleCode', 'colorway', 'gradingCompany', 'grade', 'certNumber', 'cardNumber'];
    const fieldMap: Record<string, boolean> = {};
    aiFields.forEach(f => {
      if (!currentFormFormValueIsEmpty((currentFormValues as any)[f]) && !searchHint) {
        // Do not highlight already-completed fields to avoid UI flashing unless retrying
      } else {
        fieldMap[f] = true;
      }
    });
    setAnalyzingFields(fieldMap);

    try {
      setAnalysisStage('Optimizing photos...');
      
      // Load pre-compressed base64 data URIs from cache, falling back to on-the-fly compression if missing
      const filesToProcess = currentFiles.slice(0, 3);
      const aiPhotoPayload: string[] = [];

      for (let i = 0; i < filesToProcess.length; i++) {
        const f = filesToProcess[i];
        if (typeof f === 'string') {
          aiPhotoPayload.push(f);
        } else if (f instanceof File || f instanceof Blob) {
          if (imageFilesBase64[i]) {
            aiPhotoPayload.push(imageFilesBase64[i]);
          } else {
            const base64 = await resizeAndCompressImage(f, 800, 0.6);
            aiPhotoPayload.push(base64);
            setImageFilesBase64(prev => {
              const next = [...prev];
              next[i] = base64;
              return next;
            });
          }
        }
      }

      if (aiPhotoPayload.length === 0) return;
      const idToken = await user.getIdToken();

      const suggestionsResponse = await withRetry(
        async () => {
          setAnalysisStage(searchHint ? 'Consulting AI with refined hint...' : 'Analyzing item details...');
          
          let titlePayload = searchHint || '';
          if (previousTitle) {
            titlePayload = `${titlePayload} (Note: Avoid matching as "${previousTitle}" as it is incorrect. Look for other variants or parallels.)`.trim();
          }

          return await suggestListingDetails({
            photoDataUris: aiPhotoPayload,
            title: titlePayload || form.getValues('title') || undefined,
            category: form.getValues('category'),
            idToken
          });
        },
        {
          maxRetries: 3,
          onRetry: (_err: any, attemptNum: number) => {
            setIsRetrying(true);
            setAnalysisStage(`High Demand... Retrying (Attempt ${attemptNum})`);
          }
        }
      );

      setIsRetrying(false);

      if (suggestionsResponse.error) {
        throw new Error(suggestionsResponse.error);
      }

      setAnalysisStage('Mapping suggestions...');
      const suggestions = suggestionsResponse.data;
      if (suggestions) {
        // If there are alternatives, open alternatives modal
        if (suggestions.alternatives && suggestions.alternatives.length > 0) {
            setPendingAlternatives([{...suggestions, isPrimary: true}, ...suggestions.alternatives]);
            setPendingAiData({
                baseSuggestions: suggestions,
                fieldMap,
                detectedCategory: suggestions.category || form.getValues('category') || 'Sneakers',
                isCard: (suggestions.category || '').toLowerCase().includes('card') || form.getValues('category') === 'Collector Cards'
            });
            setShowAlternativesModal(true);
            return;
        }

        const newSuggestedFields = suggestions.suggestedFields || [];
        setSuggestedFields(prev => [...new Set([...prev, ...newSuggestedFields])]);

        const detectedCategory = suggestions.category || form.getValues('category') || 'Sneakers';
        const norm = detectedCategory.toLowerCase();
        let finalType: 'sneakers' | 'collector-cards' | 'coins' | null = null;
        if (norm.includes('card')) {
          finalType = 'collector-cards';
        } else if (norm.includes('coin')) {
          finalType = 'coins';
        } else if (norm.includes('sneaker') || norm.includes('shoe')) {
          finalType = 'sneakers';
        }

        if (finalType) {
          setSelectedType(finalType);
          localStorage.setItem('preferredListingType', finalType);
        } else {
          setSelectedType(null);
        }

        const isCard = finalType === 'collector-cards' || norm.includes('card');

        applyAiDataToForm(suggestions, fieldMap, detectedCategory, isCard);
      }
    } catch (error: any) {
      console.error("Auto-fill error detailed:", error);
      const isHighDemand = error.message?.includes('503') || error.message?.toLowerCase().includes('demand') || error.message?.toLowerCase().includes('busy');
      
      toast({
        title: isHighDemand ? "AI High Demand" : "Auto-fill stalled",
        description: isHighDemand 
            ? "The AI service is very busy. Please try again in 30 seconds." 
            : "AI analysis failed. You can still fill details manually.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setIsRetrying(false);
      setAnalysisStage('');
      setAnalyzingFields({});
    }
  };

  const applyAiDataToForm = (suggestions: any, fieldMap: Record<string, boolean>, detectedCategory: string, isCard: boolean) => {
    if (suggestions.title) {
      setPreviousTitle(suggestions.title);
    }
    
    Object.entries(suggestions).forEach(([key, value]) => {
      if (value && key !== 'suggestedFields' && key !== 'alternatives') {
        const currentVal = form.getValues(key as any);
        const isFieldPending = fieldMap[key] || currentValFormValueIsEmpty(currentVal);

        if (isFieldPending) {
          let finalValue = value;
          if (isCard) {
            if (key === 'brand' && suggestions.model && !String(value).includes(suggestions.model)) {
              finalValue = `${value} ${suggestions.model}`;
            }
            if (key === 'manufacturer' && !suggestions.brand) {
              form.setValue('brand', value as string);
            }
          }
          form.setValue(key as any, finalValue);
        }
      }
    });

    if (isCard && suggestions.manufacturer && currentValFormValueIsEmpty(form.getValues('brand'))) {
      form.setValue('brand', suggestions.manufacturer);
    }

    if (!form.getValues('quantity')) form.setValue('quantity', 1);
    if (form.getValues('isNegotiable') === undefined) form.setValue('isNegotiable', true);

    setTimeout(() => {
      form.trigger();
      toast({
        title: '✨ AI Picture Check Complete!',
        description: `Detected ${detectedCategory}. All details filled.`,
        action: (
          <div className="flex gap-1.5 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 h-8 rounded-lg text-xs font-semibold" 
              onClick={(e) => {
                e.preventDefault();
                setShowRetryModal(true);
              }}
            >
              Search Again
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 h-8 rounded-lg text-xs" 
              onClick={(e) => {
                e.preventDefault();
                undoLastAIAction();
              }}
            >
              Undo
            </Button>
          </div>
        )
      });
    }, 100);
  };

  const handleStep0AutoFill = async (files: File[]) => {
    if (!files.length || !user || isAnalyzing) return;
    setIsAnalyzing(true);
    
    // Optimistic guessing: analyze filenames to immediately select category layout
    const fileNames = files.map(f => f.name.toLowerCase()).join(' ');
    let optimisticType: 'sneakers' | 'collector-cards' | 'coins' | null = null;
    if (fileNames.includes('card') || fileNames.includes('panini') || fileNames.includes('topps') || fileNames.includes('pokemon')) {
      optimisticType = 'collector-cards';
    } else if (fileNames.includes('coin') || fileNames.includes('mint') || fileNames.includes('penny') || fileNames.includes('florin')) {
      optimisticType = 'coins';
    } else if (fileNames.includes('shoe') || fileNames.includes('sneaker') || fileNames.includes('nike') || fileNames.includes('jordan') || fileNames.includes('yeezy')) {
      optimisticType = 'sneakers';
    }

    if (optimisticType) {
      setSelectedType(optimisticType);
      form.setValue('category', optimisticType === 'sneakers' ? 'Sneakers' : optimisticType === 'coins' ? 'Coins' : 'Collector Cards');
    }

    // Save snapshot of empty values for rollback
    const initialFormState = form.getValues();
    const snapshot = JSON.parse(JSON.stringify({
      ...initialFormState,
      imageFiles: initialFormState.imageFiles
    }));
    setFormHistory(prev => [...prev, snapshot]);

    // Setup analyzing skeletons for all AI target fields
    const aiFields = ['title', 'description', 'brand', 'model', 'condition', 'price', 'year', 'size', 'styleCode', 'colorway', 'gradingCompany', 'grade', 'certNumber', 'cardNumber'];
    const fieldMap: Record<string, boolean> = {};
    aiFields.forEach(f => {
      fieldMap[f] = true;
    });
    setAnalyzingFields(fieldMap);

    try {
      setAnalysisStage('Optimizing photos...');
      // 1. Process files in a single pass canvas operation
      const processedResults = await processListingImages(files);
      
      const compressedFiles = processedResults.map(r => r.file);
      const newPreviews = processedResults.map(r => r.previewUrl);
      const newBase64s = processedResults.map(r => r.base64ForAI);

      form.setValue('imageFiles', compressedFiles, { shouldValidate: true });
      setImagePreviews(newPreviews);
      setImageFilesBase64(newBase64s);

      // Optimistic transition: instantly advance to Step 1 while AI works in background
      setCurrentStep(1);
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 2. Perform AI classification and detail extraction
      const aiPhotoPayload = newBase64s.slice(0, 3);
      const idToken = await user.getIdToken();

      setAnalysisStage('Classifying listing type...');
      const suggestionsResponse = await withRetry(
        async () => {
          return await suggestListingDetails({
            photoDataUris: aiPhotoPayload,
            idToken
          });
        },
        {
          maxRetries: 3,
          onRetry: (_err, attemptNum) => {
            setIsRetrying(true);
            setAnalysisStage(`High Demand... Retrying (Attempt ${attemptNum})`);
          }
        }
      );

      setIsRetrying(false);

      if (suggestionsResponse.error) {
        throw new Error(suggestionsResponse.error);
      }

      setAnalysisStage('Mapping details...');
      const suggestions = suggestionsResponse.data;
      if (suggestions) {
        const newSuggestedFields = suggestions.suggestedFields || [];
        setSuggestedFields(newSuggestedFields);

        // Map final refined category and update category states
        const detectedCategory = suggestions.category || 'Sneakers';
        const norm = detectedCategory.toLowerCase();
        let finalType: 'sneakers' | 'collector-cards' | 'coins' | null = null;
        if (norm.includes('card')) {
          finalType = 'collector-cards';
        } else if (norm.includes('coin')) {
          finalType = 'coins';
        } else if (norm.includes('sneaker') || norm.includes('shoe')) {
          finalType = 'sneakers';
        }

        setSelectedType(finalType);
        if (finalType) {
          localStorage.setItem('preferredListingType', finalType);
          form.setValue('category', finalType === 'sneakers' ? 'Sneakers' : finalType === 'coins' ? 'Coins' : 'Collector Cards');
        } else {
          form.setValue('category', detectedCategory);
        }

        const isCard = finalType === 'collector-cards' || norm.includes('card');

        // Check for alternatives
        if (suggestions.alternatives && suggestions.alternatives.length > 0) {
            setPendingAlternatives([{...suggestions, isPrimary: true}, ...suggestions.alternatives]);
            setPendingAiData({
                baseSuggestions: suggestions,
                fieldMap,
                detectedCategory,
                isCard
            });
            setShowAlternativesModal(true);
            return; // Pause execution until user selects
        }

        applyAiDataToForm(suggestions, fieldMap, detectedCategory, isCard);
      }
    } catch (error: any) {
      console.error("Step 0 Auto-fill error:", error);
      toast({
        title: "AI Analysis stalled",
        description: "We couldn't classify your item. Please fill out details manually.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setIsRetrying(false);
      setAnalysisStage('');
      setAnalyzingFields({});
    }
  };

  const nextStep = async () => {
    const fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      if (imageFiles.length === 0) {
        toast({
          title: "Photos Required",
          description: "Please upload at least one photo to proceed.",
          variant: "destructive"
        });
        return;
      }
      fieldsToValidate.push('title', 'category', 'condition');
      if (selectedType === 'sneakers') {
        fieldsToValidate.push('brand');
      }
    } else if (currentStep === 2) {
      fieldsToValidate.push('price', 'quantity');
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        toast({
          title: "Missing Information",
          description: "Please check the highlighted fields.",
          variant: "destructive"
        });
        return;
      }
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      await handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async (createNew: boolean = false) => {
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
        setIsSubmitting(false);
        return;
      }

      const values = form.getValues();
      const currentFiles = [...values.imageFiles];
      const newFiles = currentFiles.filter(
        (f: any) => f instanceof File || f instanceof Blob
      ) as (File | Blob)[];
      const existingUrls = currentFiles.filter((f: any) => typeof f === 'string') as string[];

      const performPublish = async () => {
        try {
          let finalUrls = existingUrls;
          if (newFiles.length > 0) {
            const uploaded = await uploadImages(newFiles, `products/${user.uid}`);
            finalUrls = [...existingUrls, ...uploaded];
          }

          if (!finalUrls.length) {
            throw new Error("Upload failed. Please re-select your images.");
          }

          const { imageFiles, ...rest } = values;
          const listingData = JSON.parse(JSON.stringify({
            ...rest,
            imageUrls: finalUrls,
            category: values.category || 'Sneakers',
            isVault: false,
          }));

          const draftId = await saveDraftListing(user.uid, listingData, editId || undefined);
          await publishListing(draftId, user.uid);

          if (draftId) {
            await clearListingImagesCache(draftId);
          }

          toast({ title: "Success!", description: `Your listing "${values.title}" is now LIVE!` });

          if (!createNew) {
            // Bypass router cache to ensure images load correctly
            router.refresh();
            router.push(`/product/${draftId}`);
          }
        } catch (error: any) {
          toast({ title: "Error publishing listing", description: error.message, variant: "destructive" });
        }
      };

      if (createNew) {
        toast({ title: "Publishing in background...", description: "You can start your next listing now." });
        
        // Start background upload & publish without awaiting it
        performPublish();

        // Immediately reset form to let user create a new listing
        form.reset({
          title: '',
          description: '',
          price: 0,
          category: '',
          subCategory: '',
          condition: 'Used',
          quantity: 1,
          isReverseBidding: false,
          isNegotiable: true,
          autoRepricingEnabled: false,
          isVault: false,
          allowLocalPickup: true,
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
          gradingCompany: '',
          grade: '',
          certNumber: '',
          cardNumber: '',
          multibuyEnabled: false,
          multibuyTiers: [],
          acceptsPayId: true,
        });
        setImagePreviews([]);
        setImageFilesBase64([]); // Clear base64 cache
        setSuggestedFields([]);
        setAnalyzingFields({});
        setFormHistory([]);
        setPendingAlternatives([]);
        setPendingAiData(null);
        setPreviousTitle('');
        setRetryHint('');
        setAnalysisStage('');
        setSelectedType(null); // Reset layout category choice
        setCurrentStep(0); // Return to camera selection/type selection step
        if (editId) {
          router.replace('/sell/create'); // Remove edit param from URL
        }
        setIsSubmitting(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setAnalysisStage('Publishing listing live...');
        await performPublish();
        setIsSubmitting(false);
        setAnalysisStage('');
      }

    } catch (error: any) {
      toast({ title: "Error starting publish", description: error.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (!user) {
      toast({ title: "Must be logged in", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const values = form.getValues();
      const currentFiles = values.imageFiles;
      const newFiles = currentFiles.filter(
        (f: any) => f instanceof File || f instanceof Blob
      ) as (File | Blob)[];
      const existingUrls = currentFiles.filter((f: any) => typeof f === 'string') as string[];

      let finalUrls = existingUrls;
      if (newFiles.length > 0) {
        const uploaded = await uploadImages(newFiles, `products/${user.uid}`);
        finalUrls = [...existingUrls, ...uploaded];
      }

      const { imageFiles, ...rest } = values;
      const listingData = JSON.parse(JSON.stringify({
        ...rest,
        imageUrls: finalUrls,
        category: values.category || 'Sneakers',
        isVault: false,
      }));

      const draftId = await saveDraftListing(user.uid, listingData, editId || undefined);

      if (draftId) {
        await clearListingImagesCache(draftId);
      }

      toast({ title: "Draft Saved!", description: "Your listing draft has been saved." });
      router.push(`/sell/dashboard`);
    } catch (error: any) {
      toast({ title: "Error saving draft", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = useCallback((field: string) => {
    setSuggestedFields(prev => prev.filter(f => f !== field));
    setAnalyzingFields(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  if (isLoadingDraft) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (currentStep === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full">
          <ListingTypeStep 
            onSelect={handleTypeSelect} 
            selectedType={selectedType}
            onImagesSelect={handleStep0AutoFill}
            isAnalyzing={isAnalyzing}
            analysisStage={analysisStage}
          />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <BeforeUnload when={form.formState.isDirty && !isSubmitting} />
      <div className="bg-background min-h-screen pb-32">
        {/* Header */}
        <div className="bg-card/80 backdrop-blur-md border-b border-white/10 sticky top-0 z-30 shadow-sm">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10" 
                onClick={() => {
                  setCurrentStep(0);
                  setSelectedType(null);
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-bold text-white">Create Your Listing</h1>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                {selectedType === 'sneakers' ? 'Sneakers' : selectedType === 'coins' ? 'Coins' : 'Collector Cards'}
              </span>
            </div>
          </div>
        </div>

        <main className="container mx-auto px-4 py-8 pb-32 max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Form Section */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Category Header Switcher */}
              <div className="bg-card p-5 rounded-2xl border border-white/10 flex items-center justify-between shadow-lg">
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Listing Category</h3>
                  <p className="text-xs text-slate-400 mt-1">Currently listing in <span className="font-bold text-indigo-400">{selectedType === 'sneakers' ? 'Sneakers' : selectedType === 'coins' ? 'Coins' : 'Collector Cards'}</span></p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs rounded-lg font-semibold"
                  onClick={() => {
                    setCurrentStep(0);
                    setSelectedType(null);
                  }}
                >
                  Change Category
                </Button>
              </div>

              {/* 1. Photos Section */}
              <div className="space-y-4">
                <ImageUploadStep
                  imageFiles={imageFiles}
                  imagePreviews={imagePreviews}
                  onImagesChange={handleImagesChange}
                  onRemoveImage={removeImage}
                  onRotateImage={handleRotateImage}
                  onAutoFill={() => handleAutoFill()}
                  isAnalyzing={isAnalyzing}
                  isRetrying={isRetrying}
                  analysisStage={analysisStage}
                  selectedType={selectedType || 'sneakers'}
                  onGradeComplete={(grade) => form.setValue('condition', grade)}
                  onApplySuggestions={(res) => { Object.entries(res).forEach(([k, v]) => { if (v) form.setValue(k as any, v) }); }}
                  form={form}
                />
              </div>

              {/* 2. Specs & Descriptions */}
              <div className="animate-in fade-in duration-300">
                <DetailsStep
                  form={form}
                  selectedType={selectedType || 'sneakers'}
                  subCategories={SUB_CATEGORIES}
                  conditionOptions={CONDITION_OPTIONS}
                  onAutoFill={handleAutoFill}
                  isAnalyzing={isAnalyzing}
                  analysisStage={analysisStage}
                  suggestedFields={suggestedFields}
                  onFieldChange={handleFieldChange}
                  imageFiles={imageFiles}
                  analyzingFields={analyzingFields}
                />
              </div>

              {/* 3. Pricing, Inventory & Shipping */}
              <div className="animate-in fade-in duration-400">
                <PricingAndDeliveryStep 
                  form={form} 
                  suggestedFields={suggestedFields} 
                  onFieldChange={handleFieldChange}
                  analyzingFields={analyzingFields}
                />
              </div>

              {/* Bottom Unified Action Buttons */}
              <div className="flex flex-col md:flex-row items-center gap-3 justify-center py-8 border-t border-white/10 pt-8 mt-10">
                <Button 
                  onClick={(e) => { e.preventDefault(); handleSubmit(false); }} 
                  disabled={isSubmitting} 
                  className="w-full md:w-auto min-w-[180px] bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-black rounded-xl h-14 text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Send className="h-4 w-4" />}
                  Publish Listing
                </Button>

                <Button 
                  onClick={(e) => { e.preventDefault(); handleSubmit(true); }} 
                  disabled={isSubmitting} 
                  className="w-full md:w-auto min-w-[180px] bg-white text-indigo-950 hover:bg-slate-100 font-black rounded-xl h-14 text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  Publish & Add New
                </Button>

                <Button 
                  variant="outline" 
                  onClick={(e) => { e.preventDefault(); handleSaveDraftOnly(); }} 
                  disabled={isSubmitting} 
                  className="w-full md:w-auto min-w-[180px] border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-xl h-14 text-sm font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Package className="h-4 w-4 text-slate-300" />
                  Save Draft
                </Button>
              </div>

            </div>

            {/* Right Column: Sticky Buyer Live Preview */}
            <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 px-1 animate-pulse">
                <Eye className="h-4 w-4" /> Live Buyer Preview
              </h3>
              
              {/* Interactive Live Preview Card */}
              <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 hover:border-indigo-500/30 transition-all duration-300">
                <div className="flex flex-col">
                  {/* Photo Section */}
                  <div className="aspect-square bg-slate-950 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                    {imagePreviews[0] ? (
                      <Image
                        src={imagePreviews[0]}
                        alt="Preview"
                        fill
                        className="object-cover animate-in fade-in duration-300"
                        unoptimized
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-500 p-8 text-center space-y-3">
                        <div className="bg-slate-900 p-4 rounded-full border border-white/5">
                          <ImagePlus className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">No photos captured yet</p>
                        <p className="text-[10px] text-slate-500">Your first photo will display here as the cover image</p>
                      </div>
                    )}
                    
                    {imagePreviews.length > 1 && (
                      <div className="absolute bottom-4 left-4 flex gap-2">
                        <span className="bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-wider text-white shadow-sm border border-white/20">
                          + {imagePreviews.length - 1} Photos
                        </span>
                      </div>
                    )}
                    
                    {form.watch('isVault') && (
                      <div className="absolute top-4 right-4 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md flex items-center gap-1 border border-emerald-400/40 shadow-lg">
                        <ShieldCheck className="h-3.5 w-3.5" /> VAULT
                      </div>
                    )}
                  </div>

                  {/* Details Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        {form.watch('category') || 'Category'}
                      </span>
                      {form.watch('condition') && (
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider bg-white/5 px-2.5 py-0.5 rounded border border-white/10">
                          {form.watch('condition')}
                        </span>
                      )}
                    </div>

                    <h2 className="text-lg font-black text-white line-clamp-2 min-h-[48px] leading-snug">
                      {form.watch('title') || "Your Listing Title"}
                    </h2>

                    {/* Specs badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {form.watch('brand') && (
                        <span className="text-[9px] bg-slate-800 border border-white/5 px-2 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">{form.watch('brand')}</span>
                      )}
                      {form.watch('model') && (
                        <span className="text-[9px] bg-slate-800 border border-white/5 px-2 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">{form.watch('model')}</span>
                      )}
                      {form.watch('size') && (
                        <span className="text-[9px] bg-slate-800 border border-white/5 px-2 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">US {form.watch('size')}</span>
                      )}
                      {form.watch('year') && (
                        <span className="text-[9px] bg-slate-800 border border-white/5 px-2 py-0.5 rounded text-slate-300 font-bold uppercase tracking-wider">{form.watch('year')}</span>
                      )}
                    </div>

                    {/* Multibuy discount badge indicator */}
                    {form.watch('multibuyEnabled') && form.watch('multiCardTier') && (
                      <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Volume Discount:</span>
                        {[
                          { id: 'bronze', label: 'Bronze Discount', color: 'bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 border border-amber-600/30 text-amber-100' },
                          { id: 'silver', label: 'Silver Discount', color: 'bg-gradient-to-r from-slate-400 via-slate-500 to-slate-600 border border-slate-300/30 text-white' },
                          { id: 'gold', label: 'Gold Discount', color: 'bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 border border-yellow-400/30 text-amber-950 font-black' },
                          { id: 'platinum', label: 'Platinum Discount', color: 'bg-gradient-to-r from-slate-100 via-indigo-100 to-slate-200 border border-indigo-200/30 text-indigo-950 font-black' }
                        ].map((t) => form.watch('multiCardTier') === t.id && (
                          <span key={t.id} className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-black tracking-wider ${t.color}`}>
                            {t.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Price & Offers */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Listing Price</p>
                        <p className="text-2xl font-black text-indigo-400">${form.watch('price') || '0.00'}</p>
                      </div>
                      {form.watch('isNegotiable') && (
                        <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider">
                          Offers Allowed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>

        {/* Alternative Selection Modal */}
        <Dialog open={showAlternativesModal} onOpenChange={setShowAlternativesModal}>
          <DialogContent className="max-w-md bg-slate-950 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" /> Did we get this right?
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                The AI found a few possible matches. Please select the correct option below.
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex flex-col gap-3 mt-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {pendingAlternatives.map((alt, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    const finalSuggestions = { ...pendingAiData.baseSuggestions, ...alt };
                    applyAiDataToForm(finalSuggestions, pendingAiData.fieldMap, pendingAiData.detectedCategory, pendingAiData.isCard);
                    setShowAlternativesModal(false);
                    setPendingAlternatives([]);
                    setPendingAiData(null);
                  }}
                  className="p-4 rounded-xl border border-white/10 hover:border-indigo-500 bg-white/5 hover:bg-indigo-500/10 cursor-pointer transition-all group flex gap-3 items-start relative"
                >
                  {alt.isPrimary && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-[10px] uppercase font-bold px-2 py-0.5 rounded-bl-lg rounded-tr-xl">
                      Best Match
                    </div>
                  )}
                  <div className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-white/40 group-hover:text-white" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-white">{alt.title || `${alt.year || ''} ${alt.brand || ''} ${alt.model || ''} ${alt.cardNumber || ''}`}</h4>
                    {alt.description && <p className="text-xs text-slate-400 line-clamp-2">{alt.description}</p>}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {alt.brand && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{alt.brand}</span>}
                      {alt.cardNumber && <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-300">{alt.cardNumber}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-col">
              <Button 
                variant="outline" 
                className="border-indigo-500/30 text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 w-full font-bold flex items-center justify-center gap-1.5" 
                onClick={() => {
                  setShowAlternativesModal(false);
                  setShowRetryModal(true);
                }}
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                None of these match (Search Again)
              </Button>
              <Button variant="outline" className="border-white/20 bg-transparent text-white w-full hover:bg-white/10" onClick={() => setShowAlternativesModal(false)}>
                Cancel (Fill Manually)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Search Again / Retry Modal */}
        <Dialog open={showRetryModal} onOpenChange={setShowRetryModal}>
          <DialogContent className="max-w-md bg-slate-950 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" /> Search Again with Hint
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Type a specific keyword, color parallel, year, or variant (e.g. "Red Wave parallel", "2022 Select", "Bowman Chrome") to help the AI narrow down the correct match.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              {previousTitle && (
                <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-xs text-red-300">
                  <span className="font-bold">Avoided previous match:</span> "{previousTitle}"
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Hint</label>
                <input 
                  type="text" 
                  value={retryHint} 
                  onChange={(e) => setRetryHint(e.target.value)}
                  placeholder="e.g. Pink Ice parallel, rookie card, etc."
                  className="w-full h-11 bg-white/5 border border-white/10 focus:border-indigo-500 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" className="border-white/10 bg-transparent text-white hover:bg-white/5" onClick={() => setShowRetryModal(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold" 
                onClick={() => {
                  setShowRetryModal(false);
                  handleAutoFill(retryHint);
                  setRetryHint('');
                }}
              >
                Search Again
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </Form>
  );
}

function currentFormFormValueIsEmpty(val: any): boolean {
  return val === undefined || val === null || val === '';
}

function currentValFormValueIsEmpty(val: any): boolean {
  return val === undefined || val === null || val === '' || val === 0;
}

export default function CreateListingPage() {

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <CreateListingForm />
    </Suspense>
  );
}

