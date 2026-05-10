'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowRight, CheckCircle2, AlertCircle, Sparkles, ScanLine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CardCamera } from './CardCamera';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { withRetry } from '@/ai/utils/retry';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export function CardScanner() {
    const router = useRouter();
    const { user } = useUser();
    const { toast } = useToast();

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRetrying, setIsRetrying] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);
    const [userConfirmed, setUserConfirmed] = useState(false);

    const handleCapture = (file: File) => {
        if (!user) {
            toast({ title: "Sign in required", description: "Please sign in to use the scanner.", variant: "destructive" });
            router.push('/sign-in?redirect=/card-scan');
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
        setAnalysisResult(null);

        try {
            const { uploadImages } = await import('@/lib/firebase/storage');
            const [downloadUrl] = await uploadImages([imageFile], 'temp-analysis/');

            const idToken = await user.getIdToken();

            try {
                const suggestionsResponse = await withRetry(
                    async () => await suggestListingDetails({
                        photoDataUris: [downloadUrl],
                        category: 'Collector Cards',
                        idToken
                    }),
                    {
                        maxRetries: 3,
                        onRetry: (_err: any, attempt: number) => {
                            setIsRetrying(true);
                        }
                    }
                );

                if (suggestionsResponse.error) throw new Error(suggestionsResponse.error);

                setAnalysisResult(suggestionsResponse.data);
                setIsRetrying(false);
            } catch (error: any) {
                console.error("AI Analysis failed:", error);
                toast({ title: "Scan Failed", description: error.message || "Could not analyze image.", variant: "destructive" });
                setImageFile(null);
                setImagePreview(null);
                setUserConfirmed(false);
            } finally {
                setIsAnalyzing(false);
                setIsRetrying(false);
            }
        } catch (e) {
            setIsAnalyzing(false);
            setUserConfirmed(false);
            toast({ title: "Upload Failed", description: "Could not upload image.", variant: "destructive" });
        }
    };

    const handleCreateListing = () => {
        if (!analysisResult) return;
        const params = new URLSearchParams();
        if (analysisResult.title) params.set('title', analysisResult.title);
        if (analysisResult.brand) params.set('brand', analysisResult.brand);
        if (analysisResult.model) params.set('model', analysisResult.model);
        if (analysisResult.gradingCompany) params.set('gradingCompany', analysisResult.gradingCompany);
        if (analysisResult.grade) params.set('grade', analysisResult.grade);
        if (analysisResult.cardNumber) params.set('cardNumber', analysisResult.cardNumber);
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
                <CardCamera onCapture={handleCapture} isLoading={isAnalyzing} />
            ) : (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative aspect-[2.5/3.5] w-full max-w-sm mx-auto rounded-3xl overflow-hidden bg-slate-900 border-4 border-white shadow-2xl">
                        <Image
                            src={imagePreview}
                            alt="Card Scan Preview"
                            fill
                            className="object-contain"
                        />
                        
                        {/* FULL OVERLAY FRAME */}
                        {!userConfirmed && !isAnalyzing && (
                            <div className="absolute inset-0 pointer-events-none p-8">
                                <div className="w-full h-full border-2 border-indigo-400/30 rounded-xl relative">
                                    {/* Corners */}
                                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
                                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
                                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
                                    
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="bg-slate-900/80 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border border-white/20 shadow-2xl flex items-center gap-2">
                                            <ScanLine className="w-4 h-4 text-indigo-400" />
                                            Is the text sharp?
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {isAnalyzing && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xl text-white text-center p-6">
                                <div className="relative">
                                    <Loader2 className="w-16 h-16 animate-spin text-indigo-500" strokeWidth={3} />
                                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-white animate-pulse" />
                                </div>
                                <p className="mt-6 font-black text-xl tracking-tight uppercase">
                                    {isRetrying ? "Service Busy..." : "Analyzing Card"}
                                </p>
                                <p className="text-slate-400 text-sm mt-2">Checking database for matches...</p>
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
                        <div className="max-w-sm mx-auto space-y-4 animate-in slide-in-from-bottom-8 duration-500">
                            <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-900 leading-none">Verify Photo</h4>
                                        <p className="text-xs text-slate-500 mt-1 font-medium">Card should be centered and sharp</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 h-14 rounded-2xl border-2 font-bold text-slate-600 hover:bg-slate-50"
                                        onClick={resetScan}
                                    >
                                        Retake
                                    </Button>
                                    <Button
                                        className="flex-[2] h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-black text-lg shadow-lg shadow-indigo-200"
                                        onClick={handleAnalyze}
                                    >
                                        Analyze Card
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {analysisResult && (
                        <Card className="border-none shadow-2xl rounded-[32px] overflow-hidden bg-white">
                            <div className="h-2 w-full bg-indigo-600"></div>
                            <CardContent className="p-8 space-y-6">
                                <div className="flex items-center gap-3 text-indigo-600">
                                    <Sparkles className="w-8 h-8" />
                                    <span className="font-black text-2xl tracking-tight uppercase">Identified!</span>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Player / Set</p>
                                        <p className="font-bold text-slate-900 text-lg leading-tight">{analysisResult.title}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Card Number</p>
                                        <p className="font-bold text-slate-900 text-lg">{analysisResult.cardNumber || '—'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Condition</p>
                                        <p className="font-bold text-slate-900 text-lg">{analysisResult.grade || 'Raw'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Market Value</p>
                                        <p className="font-black text-green-600 text-2xl">${analysisResult.price}</p>
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-16 text-xl font-black bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 rounded-2xl"
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
