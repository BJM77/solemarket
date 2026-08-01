'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from "@/hooks/use-toast";
import { useUser } from '@/firebase';
import { uploadImages } from '@/lib/firebase/storage';
import { CameraCapture } from '@/components/ui/camera-capture';
import { parseFacebookMarketplaceScreenshot } from '@/app/actions/marketplace/proload-parser';
import { createProductAction } from '@/app/actions/marketplace/products';
import { resizeAndCompressImage, cn } from '@/lib/utils';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Icons
import {
  UploadCloud,
  Camera,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Trash2,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  Loader2,
  ChevronLeft,
  ClipboardPaste,
} from 'lucide-react';

export default function ProloadPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useUser();

  // Step state: 'upload' | 'analyzing' | 'review' | 'submitting'
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'submitting'>('upload');
  
  // Image states
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<{ file?: File; url: string; isNew?: boolean }[]>([]);
  
  // Analysis progress state
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState('');

  // Form values
  const [formData, setFormData] = useState({
    title: '',
    price: 0,
    category: 'Accessories' as 'Sneakers' | 'Apparel' | 'Collector Cards' | 'Accessories',
    subCategory: '',
    brand: '',
    model: '',
    size: '',
    condition: 'Used',
    description: '',
    externalUrl: '',
  });

  const [rawSpecs, setRawSpecs] = useState<Record<string, string>>({});

  // File input refs
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const productImagesInputRef = useRef<HTMLInputElement>(null);

  // Handle screenshot upload
  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setScreenshotPreview(reader.result as string);
      setScreenshotBase64(reader.result as string);
      startAnalysis(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Start Gemini Analysis
  const startAnalysis = async (base64Data: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use Proload.",
        variant: "destructive",
      });
      return;
    }

    setStep('analyzing');
    setAnalysisProgress(15);
    setAnalysisStatus('Uploading screenshot context...');

    try {
      // Small delay for micro-animation feel
      await new Promise(resolve => setTimeout(resolve, 600));
      setAnalysisProgress(45);
      setAnalysisStatus('Extracting content using Gemini Vision AI...');

      const idToken = await user.getIdToken();
      const response = await parseFacebookMarketplaceScreenshot(idToken, base64Data);

      setAnalysisProgress(80);
      setAnalysisStatus('Processing structured attributes...');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!response.success) {
        throw new Error(response.error);
      }

      const data = response.data;
      setFormData({
        title: data.title || '',
        price: data.price || 0,
        category: data.category || 'Accessories',
        subCategory: data.subCategory || '',
        brand: data.brand || '',
        model: data.model || '',
        size: data.size || '',
        condition: data.condition || 'Used',
        description: data.description || '',
        externalUrl: data.externalUrl || '',
      });

      if (data.specs) {
        setRawSpecs(data.specs);
      }

      setAnalysisProgress(100);
      setAnalysisStatus('Ready for review');
      await new Promise(resolve => setTimeout(resolve, 400));
      setStep('review');

      toast({
        title: "AI Analysis Complete",
        description: "Successfully extracted listing details from the screenshot.",
      });

    } catch (error: any) {
      console.error(error);
      setStep('upload');
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze screenshot. Please try a clearer screenshot.",
        variant: "destructive",
      });
    }
  };

  // Add captured/uploaded product images
  const addProductImages = async (files: File[]) => {
    const newImages = await Promise.all(
      files.map(async (file) => {
        // Compress and resize
        const compressed = await resizeAndCompressImage(file, 1024, 0.7);
        // Create local preview blob URL
        const blobUrl = URL.createObjectURL(file);
        return { file, url: blobUrl, isNew: true };
      })
    );
    setProductImages(prev => [...prev, ...newImages]);
  };

  // Handle local file selection for product photos
  const handleProductPhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addProductImages(Array.from(e.target.files));
    }
  };

  // Remove product photo
  const removeProductPhoto = (index: number) => {
    setProductImages(prev => {
      const updated = [...prev];
      if (updated[index].isNew && updated[index].url.startsWith('blob:')) {
        URL.revokeObjectURL(updated[index].url);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  // Submit and create the product on Benched
  const handlePublish = async (isDraftStatus = false) => {
    if (!user) return;
    
    // Validate images: we need at least 1 image unless saving as draft
    if (productImages.length === 0 && !isDraftStatus) {
      toast({
        title: "Photos Required",
        description: "Please upload or capture at least one actual photo of the product.",
        variant: "destructive",
      });
      return;
    }

    setStep('submitting');

    try {
      const idToken = await user.getIdToken();

      // 1. Upload files to Storage
      const filesToUpload = productImages
        .filter(img => img.isNew && img.file)
        .map(img => img.file as File);
      
      let imageUrls = productImages
        .filter(img => !img.isNew)
        .map(img => img.url);

      if (filesToUpload.length > 0) {
        const uploadedUrls = await uploadImages(filesToUpload, `products/${user.uid}`);
        imageUrls = [...imageUrls, ...uploadedUrls];
      }

      // 2. Call standard createProductAction
      const productPayload = {
        ...formData,
        imageUrls,
        status: isDraftStatus ? 'draft' as const : 'available' as const,
        isDraft: isDraftStatus,
        quantity: 1,
        // Fill sneaker specifics or compatibility attributes if needed
        boxCondition: formData.category === 'Sneakers' ? 'Good Box' as const : undefined,
        externalUrl: formData.externalUrl.trim() || undefined,
        externalSource: formData.externalUrl.trim() ? ('facebook_marketplace' as const) : undefined,
      };

      const result = await createProductAction(idToken, productPayload);

      if (!result.success) {
        throw new Error(result.error);
      }

      toast({
        title: isDraftStatus ? "Draft Saved!" : "Product Published!",
        description: isDraftStatus ? "Your product has been saved as a draft." : "Your product is now live on Benched.",
      });

      router.push(`/sell/listings`);
    } catch (error: any) {
      console.error(error);
      setStep('review');
      toast({
        title: "Submission Failed",
        description: error.message || "Failed to submit product.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto flex items-center justify-between border-b border-white/10 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-xl border border-primary/20 text-primary">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black font-headline tracking-tight uppercase flex items-center gap-2">
              PROLOAD <Badge className="bg-primary text-black font-black uppercase text-[10px]">AI BETA</Badge>
            </h1>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">FB Marketplace Importer & Auto-Lister</p>
          </div>
        </div>
        {step === 'review' && (
          <Button
            variant="ghost"
            onClick={() => {
              setStep('upload');
              setScreenshotPreview(null);
              setProductImages([]);
            }}
            className="text-zinc-400 hover:text-white hover:bg-zinc-950 font-bold uppercase text-xs"
          >
            <ChevronLeft className="w-4 h-4 mr-2" /> Start Over
          </Button>
        )}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Upload Step */}
        {step === 'upload' && (
          <Card className="bg-zinc-950 border-white/10 text-white max-w-2xl mx-auto overflow-hidden relative shadow-glow">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <Sparkles className="w-40 h-40 text-primary" />
            </div>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-primary animate-pulse" />
                Upload Marketplace Listing Screenshot
              </CardTitle>
              <CardDescription className="text-zinc-400 text-xs">
                Take a screenshot of any Facebook Marketplace listing on your device and upload it here. Gemini AI will scan it and fill in all the details for you automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                onClick={() => screenshotInputRef.current?.click()}
                className="border-dashed border-2 border-white/10 hover:border-primary/50 transition-all rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer text-center bg-zinc-900/50 hover:bg-zinc-900"
              >
                <div className="bg-zinc-800 p-4 rounded-full mb-4 ring-8 ring-zinc-800/40 text-zinc-400">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wider">Drag & drop or Click to browse</h3>
                <p className="text-[10px] text-zinc-500 mt-1 max-w-xs font-semibold uppercase tracking-wider">
                  Supports PNG, JPG, JPEG screenshots
                </p>
                <input
                  type="file"
                  ref={screenshotInputRef}
                  onChange={handleScreenshotChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="flex gap-3 bg-zinc-900/80 p-4 rounded-xl border border-white/5 items-start">
                  <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-zinc-300">Intelligent Extraction</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Gemini parses title, condition, price, category, brand, model, size, and the full description directly.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 bg-zinc-900/80 p-4 rounded-xl border border-white/5 items-start">
                  <Camera className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-zinc-300">Fresh Photos Integration</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Add the high-quality product images or use your device camera directly on the next step to ensure clear listings.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analyzing / Parsing Step */}
        {step === 'analyzing' && (
          <Card className="bg-zinc-950 border-white/10 text-white max-w-md mx-auto py-12 px-6 text-center shadow-glow">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
                  <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="font-black uppercase tracking-wider text-sm">{analysisStatus}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Powered by Gemini Pro Vision</p>
              </div>
              <Progress value={analysisProgress} className="h-1 bg-white/5" />
            </CardContent>
          </Card>
        )}

        {/* Review Form & Uploading Product Photos Step */}
        {step === 'review' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Pane: Images & Camera capture */}
            <div className="lg:col-span-5 space-y-6">
              <Card className="bg-zinc-950 border-white/10 text-white overflow-hidden">
                <CardHeader className="pb-3 border-b border-white/5">
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">
                    Marketplace Screenshot Context
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 flex justify-center bg-zinc-900/40">
                  {screenshotPreview && (
                    <div className="relative w-full aspect-[9/16] max-h-[360px] rounded-xl overflow-hidden border border-white/10">
                      <Image
                        src={screenshotPreview}
                        alt="Facebook Marketplace Screenshot"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Product Photos */}
              <Card className="bg-zinc-950 border-white/10 text-white">
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-400">
                      Actual Listing Photos (Required)
                    </CardTitle>
                    <Badge variant="outline" className="text-[8px] border-white/15 text-zinc-400 font-bold uppercase">
                      {productImages.length} ADDED
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {productImages.length === 0 ? (
                    <div className="border border-dashed border-white/10 rounded-xl p-8 text-center bg-zinc-900/10">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                        No product photos added yet
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {productImages.map((img, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-900 group">
                          <Image
                            src={img.url}
                            alt={`Product Photo ${idx + 1}`}
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeProductPhoto(idx)}
                            className="absolute top-1 right-1 bg-black/75 hover:bg-red-950 text-white hover:text-red-400 p-1.5 rounded-lg border border-white/5 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Add Photo File Picker */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => productImagesInputRef.current?.click()}
                      className="border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] h-10 tracking-wider"
                    >
                      <UploadCloud className="w-4 h-4 mr-2 text-primary" /> Upload Photos
                    </Button>
                    <input
                      type="file"
                      ref={productImagesInputRef}
                      onChange={handleProductPhotosChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />

                    {/* Camera Capture component */}
                    <CameraCapture
                      onCapture={addProductImages}
                      maxFiles={6}
                      captureMode="general"
                      variant="custom"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-white/10 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] h-10 tracking-wider"
                      >
                        <Camera className="w-4 h-4 mr-2 text-primary" /> Take Photo
                      </Button>
                    </CameraCapture>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Pane: Editing Form */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="bg-zinc-950 border-white/10 text-white">
                <CardHeader className="pb-3 border-b border-white/5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4.5 h-4.5 text-primary" /> Review & Edit Product Details
                    </CardTitle>
                    <Badge className="bg-primary/10 border-primary/20 text-primary text-[8px] font-black uppercase">
                      Gemini Pre-filled
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Product Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                    />
                  </div>

                  {/* Price & Condition */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="price" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Price (AUD)</Label>
                      <Input
                        id="price"
                        type="number"
                        value={formData.price}
                        onChange={e => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                        className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="condition" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Condition</Label>
                      <Select
                        value={formData.condition}
                        onValueChange={val => setFormData(prev => ({ ...prev, condition: val }))}
                      >
                        <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                          <SelectValue placeholder="Select Condition" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {['New', 'Used', 'Mint', 'Near Mint', 'Excellent', 'Good', 'Fair'].map(c => (
                            <SelectItem key={c} value={c} className="hover:bg-zinc-800">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Category & SubCategory */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="category" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={val => setFormData(prev => ({ ...prev, category: val as any }))}
                      >
                        <SelectTrigger className="bg-zinc-900 border-white/10 text-white">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-white/10 text-white">
                          {['Sneakers', 'Apparel', 'Collector Cards', 'Accessories'].map(cat => (
                            <SelectItem key={cat} value={cat} className="hover:bg-zinc-800">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="subCategory" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Sub-Category</Label>
                      <Input
                        id="subCategory"
                        value={formData.subCategory}
                        onChange={e => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
                        className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                        placeholder="e.g. Jordan, Nike, Rims"
                      />
                    </div>
                  </div>

                  {/* Brand, Model, Size (Size conditionally rendered for Sneakers/Apparel) */}
                  <div className={cn("grid gap-4", (formData.category === 'Sneakers' || formData.category === 'Apparel') ? "grid-cols-3" : "grid-cols-2")}>
                    <div className="space-y-1.5">
                      <Label htmlFor="brand" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Brand</Label>
                      <Input
                        id="brand"
                        value={formData.brand}
                        onChange={e => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                        placeholder="e.g. Pokémon, Upper Deck, Nike"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="model" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Model / Set</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={e => setFormData(prev => ({ ...prev, model: e.target.value }))}
                        className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                        placeholder="e.g. Charizard, Air Jordan 1"
                      />
                    </div>
                    {(formData.category === 'Sneakers' || formData.category === 'Apparel') && (
                      <div className="space-y-1.5">
                        <Label htmlFor="size" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Size</Label>
                        <Input
                          id="size"
                          value={formData.size}
                          onChange={e => setFormData(prev => ({ ...prev, size: e.target.value }))}
                          className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary"
                          placeholder="e.g. US 10, Large"
                        />
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-zinc-400 font-black uppercase text-[9px] tracking-widest">Description</Label>
                    <Textarea
                      id="description"
                      rows={6}
                      value={formData.description}
                      onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-zinc-900 border-white/10 text-white focus-visible:ring-primary text-xs"
                    />
                  </div>

                  {/* Facebook Marketplace URL */}
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="externalUrl" className="text-emerald-400 font-black uppercase text-[9px] tracking-widest flex items-center gap-1.5">
                        Facebook Marketplace Listing URL (Optional)
                      </Label>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[8px] font-black uppercase">
                        3 Methods Supported
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="externalUrl"
                        type="url"
                        placeholder="https://www.facebook.com/marketplace/item/..."
                        value={formData.externalUrl}
                        onChange={e => setFormData(prev => ({ ...prev, externalUrl: e.target.value }))}
                        className="bg-zinc-900 border-emerald-500/30 text-white focus-visible:ring-emerald-500 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            if (navigator.clipboard && navigator.clipboard.readText) {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                setFormData(prev => ({ ...prev, externalUrl: text.trim() }));
                                toast({ title: "Link Pasted!", description: "Facebook URL pasted from clipboard." });
                              }
                            } else {
                              toast({ title: "Clipboard Access", description: "Please paste manually into the input field.", variant: "destructive" });
                            }
                          } catch {
                            toast({ title: "Clipboard Access", description: "Permission denied. Please paste manually.", variant: "destructive" });
                          }
                        }}
                        className="border-emerald-500/30 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/50 font-bold uppercase text-[10px] h-9 px-3 shrink-0"
                      >
                        <ClipboardPaste className="w-3.5 h-3.5 mr-1" /> Paste
                      </Button>
                    </div>
                    
                    {/* 3 Supported Methods Guide */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-[9px]">
                      <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5 flex flex-col items-center text-center">
                        <span className="font-bold text-emerald-400">1. AI Auto-Detect</span>
                        <span className="text-zinc-400 text-[8px] mt-0.5">Reads link if address bar is in screenshot</span>
                      </div>
                      <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5 flex flex-col items-center text-center">
                        <span className="font-bold text-emerald-400">2. 1-Tap Paste</span>
                        <span className="text-zinc-400 text-[8px] mt-0.5">Copy link in FB App & tap Paste above</span>
                      </div>
                      <div className="bg-zinc-900/80 p-2 rounded-lg border border-white/5 flex flex-col items-center text-center">
                        <span className="font-bold text-emerald-400">3. Manual Entry</span>
                        <span className="text-zinc-400 text-[8px] mt-0.5">Type or edit URL directly into input field</span>
                      </div>
                    </div>
                  </div>

                  {/* Raw Specs from FB (Visual context) */}
                  {Object.keys(rawSpecs).length > 0 && (
                    <div className="bg-zinc-900/35 border border-white/5 rounded-xl p-4">
                      <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-wider mb-2">
                        Extra Extracted Listing Attributes
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-zinc-300">
                        {Object.entries(rawSpecs).map(([key, value]) => (
                          <div key={key} className="flex justify-between py-0.5 border-b border-white/5">
                            <span className="text-zinc-500 font-medium capitalize">{key}:</span>
                            <span className="font-bold">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-4 pt-4 border-t border-white/5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handlePublish(true)}
                      className="flex-1 border-white/10 bg-zinc-950 hover:bg-zinc-900 text-white font-black uppercase text-xs tracking-wider h-12"
                    >
                      Save Draft
                    </Button>
                    <Button
                      type="button"
                      onClick={() => handlePublish(false)}
                      className="flex-1 bg-primary text-black hover:bg-primary/95 font-black uppercase text-xs tracking-wider h-12"
                    >
                      Publish Listing <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Submitting/Publishing State */}
        {step === 'submitting' && (
          <Card className="bg-zinc-950 border-white/10 text-white max-w-md mx-auto py-12 px-6 text-center shadow-glow">
            <CardContent className="space-y-6">
              <div className="flex justify-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black uppercase tracking-wider text-sm">Uploading Assets & Listing to Benched...</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Creating Firestore documents</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
