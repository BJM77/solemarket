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
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { quickSaveAndPublish } from '@/app/actions/admin-bulk';
import { ARCameraOverlay } from '@/components/ar-camera-overlay';
import { motion, AnimatePresence } from 'framer-motion';

export default function MultiGenPage() {
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
                videoRef.current.play().catch(e => console.error("Video play error:", e));
            }
        } catch (err) {
            console.error("Error starting camera:", err);
        }
    }, []);

    useEffect(() => {
        if (isSuperAdmin) {
            startCamera();
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [isSuperAdmin, startCamera]);

    const takePicture = () => {
        if (!videoRef.current || !canvasRef.current || capturedImages.length >= 5) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Target ratio 16:9 (Widescreen for general items)
        const targetRatio = 16 / 9;
        let sourceX = 0, sourceY = 0, sourceWidth = videoWidth, sourceHeight = videoHeight;

        if (videoWidth / videoHeight > targetRatio) {
            sourceWidth = videoHeight * targetRatio;
            sourceX = (videoWidth - sourceWidth) / 2;
        } else {
            sourceHeight = videoWidth / targetRatio;
            sourceY = (videoHeight - sourceHeight) / 2;
        }

        canvas.width = 1280;
        canvas.height = 720;

        context.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 1280, 720);

        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        const newImages = [...capturedImages, dataUri];
        setCapturedImages(newImages);

        if (newImages.length === 1 && !title) {
            handleAiFill(dataUri);
        }
    };

    const handleAiFill = async (imageToAnalyze?: string) => {
        const img = imageToAnalyze || capturedImages[0];
        if (!img || !user) return;

        setIsAnalyzing(true);
        try {
            const idToken = await user.getIdToken();
            const result = await suggestListingDetails({
                photoDataUris: [img],
                idToken
            });

            if (result) {
                setTitle(result.title);
                setAiData(result);
            }
        } catch (error) {
            console.error("AI Fill error:", error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!user || capturedImages.length === 0 || !title) return;

        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            const result = await quickSaveAndPublish(idToken, {
                ...aiData,
                title,
                category: 'Collectibles',
                price: aiData?.price || 0,
                quantity: 1,
            }, capturedImages);

            if (result.success) {
                toast({ title: "Item Listed Successfully!" });
                resetAndNext();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ title: "Failed to save", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const resetAndNext = () => {
        setCapturedImages([]);
        setTitle('');
        setAiData(null);
    };

    const removeImage = (index: number) => {
        setCapturedImages(prev => prev.filter((_, i) => i !== index));
    };

    if (isUserLoading || isPermissionsLoading) {
        return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!isSuperAdmin) return null;

    return (
        <div className="fixed inset-0 h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
            {/* Minimal Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b">
                <Button variant="ghost" size="sm" onClick={() => router.push('/admin/power-tools')}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                </Button>
                <div className="text-xs font-bold tracking-tighter uppercase text-muted-foreground flex items-center gap-1">
                    <Boxes className="size-3 text-emerald-500" />
                    Fast Gen Lister
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={cn("size-1.5 rounded-full", capturedImages.length >= i ? "bg-emerald-500" : "bg-neutral-200 dark:bg-neutral-800")} />
                    ))}
                </div>
            </div>

            {/* Camera Viewport */}
            <div className="relative flex-1 bg-black overflow-hidden m-2 rounded-2xl shadow-inner">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                />
                <ARCameraOverlay guideType="general" />

                {/* Captured Slots Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {capturedImages.map((img, idx) => (
                        <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            key={idx}
                            className="relative size-12 rounded-lg border-2 border-emerald-500/50 overflow-hidden shadow-lg group/img"
                        >
                            <NextImage src={img} width={48} height={48} className="w-full h-full object-cover" alt="Capture" unoptimized />
                            <button
                                onClick={() => removeImage(idx)}
                                className="absolute inset-0 bg-red-500/80 items-center justify-center hidden group-hover/img:flex"
                            >
                                <Trash2 className="size-4 text-white" />
                            </button>
                        </motion.div>
                    ))}
                </div>

                {/* Shutter Button */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-8">
                    <button
                        onClick={() => setCapturedImages([])}
                        className="p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full text-white active:scale-90"
                    >
                        <RotateCcw className="size-5" />
                    </button>

                    <button
                        onClick={takePicture}
                        className="size-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform bg-white/20 backdrop-blur-sm"
                    >
                        <div className="size-16 rounded-full bg-emerald-500 shadow-xl" />
                    </button>

                    <div className="size-11" />
                </div>
            </div>

            {/* Controls Bar */}
            <div className="p-4 bg-background border-t flex flex-col gap-3">
                <div className="relative">
                    <Input
                        placeholder="Item Title (AI auto-fills...)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-14 rounded-xl text-md pr-12"
                    />
                    <button
                        onClick={() => handleAiFill()}
                        disabled={capturedImages.length === 0 || isAnalyzing}
                        className={cn(
                            "absolute right-2 top-2 p-2 rounded-lg",
                            isAnalyzing ? "text-emerald-500 animate-pulse" : "text-muted-foreground hover:text-emerald-500"
                        )}
                    >
                        {isAnalyzing ? <Loader2 className="size-6 animate-spin" /> : <Sparkles className="size-6" />}
                    </button>
                </div>

                <Button
                    onClick={handleSave}
                    disabled={capturedImages.length === 0 || !title || isSaving}
                    className="h-14 rounded-xl text-lg font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/10"
                >
                    {isSaving ? <Loader2 className="size-5 animate-spin" /> : <><Save className="size-5 mr-2" /> SAVE & PUBLISH</>}
                </Button>
            </div>

            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
