'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, Sparkles, ScanLine, X } from 'lucide-react';
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
    const [userConfirmed, setUserConfirmed] = useState(false);

    const handleCapture = (file: File) => {
        if (!user) {
            toast({ title: "Sign in required", description: "Please sign in to use the scanner.", variant: "destructive" });
            router.push('/sign-in?redirect=/scan');
            return;
        }
        setImageFile(file);
        const previewUrl = URL.createObjectURL(file);
        setImagePreview(previewUrl);
        setUserConfirmed(false);
        setAnalysisResult(null);
    };

    const handleAnalyze = async () => {
        if (!imageFile || !user) return;
        setUserConfirmed(true);
        setIsAnalyzing(true);
        try {
            const { uploadImages } = await import('@/lib/firebase/storage');
            const [downloadUrl] = await uploadImages([imageFile], 'temp-analysis/');
            const idToken = await user.getIdToken();
            const suggestionsResponse = await suggestListingDetails({
                photoDataUris: [downloadUrl],
                category: 'Sneakers',
                idToken
            });
            if (suggestionsResponse.error) throw new Error(suggestionsResponse.error);
            setAnalysisResult(suggestionsResponse.data);
        } catch (error: any) {
            console.error("AI Analysis failed:", error);
            toast({ title: "Scan Failed", description: error.message || "Could not analyze image.", variant: "destructive" });
            setImageFile(null);
            setImagePreview(null);
            setUserConfirmed(false);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCreateListing = () => {
        if (!analysisResult) return;
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
        router.push(`/sell/create?${params.toString()}`);
    };

    const resetScan = () => {
        setImagePreview(null);
        setImageFile(null);
        setAnalysisResult(null);
        setUserConfirmed(false);
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-6">
            {!imagePreview ? (
                <SneakerCamera onCapture={handleCapture} isLoading={isAnalyzing} />
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative aspect-video w-full max-w-lg mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-white shadow-2xl">
                        <Image
                            src={imagePreview}
                            alt="Scan Preview"
                            fill
                            className="object-contain"
                        />
                        
                        {!userConfirmed && !isAnalyzing && (
                            <div className="absolute inset-0 pointer-events-none p-6">
                                <div className="w-full h-full border-2 border-primary/30 rounded-2xl relative">
                                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
                                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
                                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
                                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
                                    
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-slate-900/80 backdrop-blur-md text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest border border-white/10 shadow-2xl flex items-center gap-2">
                                            <ScanLine className="w-5 h-5 text-primary" />
                                            Is the whole shoe visible?
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAnalyzing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl text-white">
                                <Loader2 className="w-16 h-16 animate-spin mb-4 text-primary" strokeWidth={3} />
                                <p className="font-black text-xl tracking-tight uppercase">Analyzing Sneaker</p>
                            </div>
                        )}
                        
                        {!isAnalyzing && (
                            <button
                                onClick={resetScan}
                                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white p-2 rounded-full transition-all border border-white/20"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>

                    {!userConfirmed && !isAnalyzing && (
                        <div className="max-w-md mx-auto space-y-4">
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-6 text-center justify-center">
                                    <CheckCircle2 className="w-6 h-6 text-primary" />
                                    <h4 className="font-black text-slate-900 text-lg uppercase tracking-tight">Looks Good?</h4>
                                </div>
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-16 rounded-2xl border-2 font-bold text-slate-600 hover:bg-slate-50"
                                        onClick={resetScan}
                                    >
                                        Retake
                                    </Button>
                                    <Button
                                        className="flex-[2] h-16 rounded-2xl bg-primary hover:bg-primary/90 font-black text-xl shadow-lg"
                                        onClick={handleAnalyze}
                                    >
                                        Analyze Now
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {analysisResult && (
                        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white max-w-md mx-auto">
                            <div className="h-2 w-full bg-primary"></div>
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-center gap-3 text-primary">
                                    <Sparkles className="w-8 h-8" />
                                    <span className="font-black text-2xl tracking-tight uppercase">Match Found!</span>
                                </div>

                                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Model</p>
                                        <p className="font-bold text-slate-900 text-lg">{analysisResult.brand} {analysisResult.model}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Style Code</p>
                                        <p className="font-bold text-slate-900 text-lg">{analysisResult.styleCode || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Colorway</p>
                                        <p className="font-bold text-slate-900 text-lg">{analysisResult.colorway || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Est. Value</p>
                                        <p className="font-black text-green-600 text-2xl">${analysisResult.price}</p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-16 text-xl font-black rounded-2xl"
                                    onClick={handleCreateListing}
                                >
                                    Create Listing <ArrowRight className="ml-2 h-6 w-6" />
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
