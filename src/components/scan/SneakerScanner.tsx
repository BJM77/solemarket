'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SneakerCamera } from './SneakerCamera';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function SneakerScanner() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();
    
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);

    const handleCapture = async (file: File) => {
        if (!user) {
            toast({ title: "Sign in required", description: "Please sign in to use the scanner.", variant: "destructive" });
            router.push('/sign-in?redirect=/scan');
            return;
        }

        setImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setIsAnalyzing(true);
        setAnalysisResult(null);

        try {
            // Convert to Base64 for AI action
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async () => {
                const base64Data = reader.result as string;
                const idToken = await user.getIdToken();
                
                try {
                    const result = await suggestListingDetails({
                        photoDataUris: [base64Data],
                        category: 'Sneakers', // Hint for the AI
                        idToken
                    });
                    setAnalysisResult(result);
                } catch (error: any) {
                    console.error("AI Analysis failed:", error);
                    toast({ title: "Scan Failed", description: error.message || "Could not analyze image.", variant: "destructive" });
                    setImageFile(null);
                    setImagePreview(null);
                } finally {
                    setIsAnalyzing(false);
                }
            };
        } catch (e) {
            setIsAnalyzing(false);
        }
    };

    const handleCreateListing = () => {
        if (!analysisResult) return;

        // Construct query params
        const params = new URLSearchParams();
        if (analysisResult.title) params.set('title', analysisResult.title);
        if (analysisResult.brand) params.set('brand', analysisResult.brand);
        if (analysisResult.model) params.set('model', analysisResult.model);
        if (analysisResult.styleCode) params.set('styleCode', analysisResult.styleCode);
        if (analysisResult.colorway) params.set('colorway', analysisResult.colorway);
        if (analysisResult.size) params.set('size', analysisResult.size);
        if (analysisResult.condition) params.set('condition', analysisResult.condition);
        if (analysisResult.description) params.set('description', analysisResult.description);
        if (analysisResult.category) params.set('category', analysisResult.category);
        
        // Pass the image via temporary local storage or re-upload flow?
        // Since we can't pass File object via URL, we'll pass the analysis data.
        // The user will re-upload the photo or we can upload it here and pass the URL.
        // For speed, let's let the user re-select or we upload it now.
        // Better UX: Upload now.
        
        // Actually, upload is async and might take time. Let's redirect with data and ask user to add photo 
        // OR pass the preview via Context if we were using a global state manager.
        // Simplest: Redirect with text data, user adds photos in step 2. 
        // "We found these details! Now just add your photos."
        
        router.push(`/sell/create?${params.toString()}`);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {!imagePreview ? (
                <SneakerCamera onCapture={handleCapture} isLoading={isAnalyzing} />
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black/5 border">
                        <Image 
                            src={imagePreview} 
                            alt="Scan Preview" 
                            fill 
                            className="object-contain" 
                        />
                        {isAnalyzing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm text-white">
                                <Loader2 className="w-10 h-10 animate-spin mb-3 text-primary" />
                                <p className="font-medium animate-pulse">Analyzing Sneaker...</p>
                            </div>
                        )}
                        {!isAnalyzing && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                className="absolute top-2 right-2"
                                onClick={() => {
                                    setImagePreview(null);
                                    setImageFile(null);
                                    setAnalysisResult(null);
                                }}
                            >
                                Retake
                            </Button>
                        )}
                    </div>

                    {analysisResult && (
                        <Card className="border-primary/20 shadow-lg">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex items-center gap-2 text-primary font-bold text-lg">
                                    <Sparkles className="w-5 h-5" />
                                    <span>Match Found!</span>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Model</p>
                                        <p className="font-medium">{analysisResult.brand} {analysisResult.model}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Style Code</p>
                                        <p className="font-medium">{analysisResult.styleCode || 'Not detected'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Colorway</p>
                                        <p className="font-medium">{analysisResult.colorway || 'Unknown'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground uppercase font-bold">Est. Price</p>
                                        <p className="font-medium text-green-600">${analysisResult.price}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t flex gap-3">
                                    <Button 
                                        className="w-full h-12 text-lg font-bold" 
                                        onClick={handleCreateListing}
                                    >
                                        Create Listing <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
