'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import NextImage from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Camera,
    Boxes,
    Save,
    RotateCcw,
    Sparkles,
    Loader2,
    ChevronLeft,
    Trash2
} from 'lucide-react';
import { cn } from "@/lib/utils/ui";
import { useToast } from '@/hooks/use-toast';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { quickSaveAndPublish } from '@/app/actions/admin/admin-bulk';
import { coinListingClassification } from '@/lib/coin-listings';
import { motion, AnimatePresence } from 'framer-motion';

export interface MultiFastListerProps {
    mode: 'card' | 'coin' | 'gen';
    titleLabel: string;
    aspectRatio: number; // e.g. 5/7 for card, 1/1 for coin, 16/9 for gen
    aspectRatioStyle?: string; // Tailwind aspect class (e.g. aspect-[5/7], aspect-square, aspect-video)
    captureWidth: number;
    captureHeight: number;
    defaultCategory?: string;
}

export function MultiFastLister({
    mode,
    titleLabel,
    aspectRatio,
    aspectRatioStyle = 'aspect-[5/7]',
    captureWidth,
    captureHeight,
    defaultCategory = 'Collectibles'
}: MultiFastListerProps) {
    const { user, isUserLoading } = useUser();
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
    const router = useRouter();
    const { toast } = useToast();

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisStage, setAnalysisStage] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [title, setTitle] = useState('');
    const [aiData, setAiData] = useState<any>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Handle Authentication & Permissions
    useEffect(() => {
        if (!isUserLoading && !isPermissionsLoading) {
            if (!isSuperAdmin) {
                router.push('/admin/power-tools');
            }
        }
    }, [isSuperAdmin, isUserLoading, isPermissionsLoading, router]);

    const startCamera = useCallback(async () => {
        try {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            streamRef.current = newStream;
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Camera access failed:", err);
            toast({
                title: "Camera Error",
                description: "Could not access back camera. Check browser permissions.",
                variant: "destructive"
            });
        }
    }, [toast]);

    useEffect(() => {
        startCamera();
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [startCamera]);

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;

        if (videoWidth / videoHeight > aspectRatio) {
            sourceWidth = videoHeight * aspectRatio;
            sourceX = (videoWidth - sourceWidth) / 2;
        } else {
            sourceHeight = videoWidth / aspectRatio;
            sourceY = (videoHeight - sourceHeight) / 2;
        }

        canvas.width = captureWidth;
        canvas.height = captureHeight;

        context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, captureWidth, captureHeight);

        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        const newImages = [...capturedImages, dataUri];
        setCapturedImages(newImages);

        // Auto-trigger AI for first image
        if (newImages.length === 1 && !title) {
            handleAiFill(dataUri);
        }
    };

    const handleAiFill = async (imageToAnalyze?: string) => {
        const img = imageToAnalyze || capturedImages[0];
        if (!img || !user) return;

        setIsAnalyzing(true);
        setAnalysisStage('Analyzing...');
        try {
            const idToken = await user.getIdToken();
            setAnalysisStage('Identifying item...');
            const suggestionsResponse = await suggestListingDetails({
                photoDataUris: [img],
                idToken
            });

            setAnalysisStage('Parsing details...');

            if (suggestionsResponse.error) {
                toast({ title: "AI Error", description: suggestionsResponse.error, variant: "destructive" });
            } else if (suggestionsResponse.data) {
                const data = suggestionsResponse.data;
                setTitle(data.title || '');
                setAiData(data);
                toast({ title: "AI Parsed", description: `Matched: ${data.title}` });
            }
        } catch (error) {
            console.error("AI Fill error:", error);
        } finally {
            setIsAnalyzing(false);
            setAnalysisStage('');
        }
    };

    const handleSaveAndNext = async () => {
        if (!user || capturedImages.length === 0 || !title) {
            toast({ title: "Missing Info", description: "Snap at least 1 image and set a title.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();

            let categoryPayload: Record<string, any> = {
                category: defaultCategory
            };

            if (mode === 'coin') {
                categoryPayload = {
                    ...coinListingClassification({
                        subCategory: aiData?.subCategory,
                        title,
                        metal: aiData?.metal || aiData?.material,
                        country: aiData?.country
                    })
                };
            }

            const result = await quickSaveAndPublish(idToken, {
                ...aiData,
                title,
                ...categoryPayload,
                price: aiData?.price || 0,
                quantity: 1,
            }, capturedImages);

            if (result.success) {
                toast({ title: "Saved & Published!", description: `Item live: ${result.id}` });
                // Reset state for next card/item instantly
                setCapturedImages([]);
                setTitle('');
                setAiData(null);
            } else {
                toast({ title: "Save Failed", description: result.error, variant: "destructive" });
            }
        } catch (error: any) {
            console.error("Save error:", error);
            toast({ title: "Save Failed", description: error?.message || 'Error saving item', variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const resetCurrent = () => {
        setCapturedImages([]);
        setTitle('');
        setAiData(null);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 overflow-hidden select-none">
            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-20">
                <Button variant="ghost" size="icon" onClick={() => router.push('/admin/power-tools')} className="text-muted-foreground hover:text-white">
                    <ChevronLeft className="size-5" />
                </Button>
                <div className="text-xs font-bold tracking-tighter uppercase text-muted-foreground flex items-center gap-1">
                    <Boxes className="size-3 text-emerald-700" />
                    {titleLabel}
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div
                            key={i}
                            className={cn(
                                "size-1.5 rounded-full transition-colors",
                                capturedImages.length >= i ? "bg-emerald-700" : "bg-slate-800"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Main Interactive Stage */}
            <div className="flex-1 relative flex flex-col items-center justify-center p-4">
                {/* Visual Viewfinder Reticle */}
                <div className={cn("relative w-full max-w-sm rounded-2xl overflow-hidden border-2 border-slate-700 bg-black shadow-2xl flex items-center justify-center", aspectRatioStyle)}>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />

                    {/* Framing Reticle */}
                    <div className="absolute inset-4 border border-white/20 border-dashed rounded-xl pointer-events-none flex flex-col justify-between p-2">
                        <div className="flex justify-between w-full">
                            <div className="size-4 border-t-2 border-l-2 border-emerald-700" />
                            <div className="size-4 border-t-2 border-r-2 border-emerald-700" />
                        </div>
                        <div className="flex justify-between w-full">
                            <div className="size-4 border-b-2 border-l-2 border-emerald-700" />
                            <div className="size-4 border-b-2 border-r-2 border-emerald-700" />
                        </div>
                    </div>

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Shutter Capture Button */}
                <div className="mt-4 flex items-center gap-6">
                    <button
                        onClick={resetCurrent}
                        disabled={capturedImages.length === 0}
                        className="p-3 text-slate-500 hover:text-rose-500 transition-colors disabled:opacity-30"
                    >
                        <Trash2 className="size-5" />
                    </button>

                    <button
                        onClick={captureImage}
                        className="relative group p-1 rounded-full border-4 border-white/20 hover:border-emerald-700 transition-all duration-300 active:scale-95"
                    >
                        <div className="size-16 rounded-full bg-white group-hover:bg-emerald-700 transition-colors shadow-lg flex items-center justify-center text-slate-900">
                            <Camera className="size-6 text-slate-950" />
                        </div>
                    </button>

                    <button
                        onClick={startCamera}
                        className="p-3 text-slate-500 hover:text-white transition-colors"
                    >
                        <RotateCcw className="size-5" />
                    </button>
                </div>
            </div>

            {/* Bottom Control / Listing Tray */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col gap-3 z-20">
                {/* Thumbnails of captured stack */}
                <div className="flex gap-2 overflow-x-auto py-1 min-h-[50px] items-center">
                    <AnimatePresence>
                        {capturedImages.map((img, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative size-12 rounded-lg overflow-hidden border border-slate-700 shrink-0"
                            >
                                <NextImage src={img} alt="Capture" fill className="object-cover" />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {capturedImages.length === 0 && (
                        <div className="text-xs text-slate-500 italic">No snaps yet. Hit shutter above.</div>
                    )}
                </div>

                {/* Smart Title Input + AI Trigger */}
                <div className="relative">
                    <Input
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Listing Title (Auto-fills with AI)..."
                        className="bg-slate-950 border-slate-700 h-12 pr-12 text-sm text-white placeholder:text-slate-600 focus-visible:ring-emerald-700"
                    />
                    <button
                        onClick={() => handleAiFill()}
                        disabled={capturedImages.length === 0 || isAnalyzing}
                        className={cn(
                            "absolute right-2 top-2 p-2 rounded-lg flex items-center gap-2",
                            isAnalyzing ? "text-emerald-700 animate-pulse bg-emerald-500/10 px-3" : "text-muted-foreground hover:text-emerald-700"
                        )}
                    >
                        {isAnalyzing ? (
                            <>
                                {analysisStage && <span className="text-[10px] font-bold uppercase tracking-tight">{analysisStage}</span>}
                                <Loader2 className="size-5 animate-spin" />
                            </>
                        ) : (
                            <Sparkles className="size-6" />
                        )}
                    </button>
                </div>

                {/* Confirm & Publish CTA */}
                <Button
                    onClick={handleSaveAndNext}
                    disabled={isSaving || capturedImages.length === 0 || !title}
                    className="w-full h-12 bg-emerald-700 hover:bg-emerald-600 text-white font-bold tracking-wide flex items-center justify-center gap-2 rounded-xl transition-all shadow-lg active:scale-[0.99]"
                >
                    {isSaving ? <Loader2 className="size-5 animate-spin" /> : <Save className="size-5" />}
                    Save & Next Item
                </Button>
            </div>
        </div>
    );
}
