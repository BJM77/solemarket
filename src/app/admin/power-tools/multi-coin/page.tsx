'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Camera,
    Zap,
    Save,
    RotateCcw,
    Sparkles,
    CheckCircle2,
    Loader2,
    X,
    AlertCircle,
    ChevronLeft,
    History,
    Package,
    Coins
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { quickSaveAndPublish } from '@/app/actions/multi-card';
import { ARCameraOverlay } from '@/components/ar-camera-overlay';
import { motion, AnimatePresence } from 'framer-motion';

export default function MultiCoinPage() {
    const { user, isUserLoading } = useUser();
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();
    const router = useRouter();
    const { toast } = useToast();

    // Camera Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [sessionCount, setSessionCount] = useState(0);
    const [lastSaved, setLastSaved] = useState<string | null>(null);

    // Form State (Flattened for speed - optimized for Coins)
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: 'Coins',
        subCategory: 'Coins',
        condition: 'Good',
        year: '',
        denomination: '',
        mintMark: '',
        metal: '',
        description: ''
    });

    // Handle Authentication & Permissions
    useEffect(() => {
        if (!isUserLoading && !isPermissionsLoading) {
            if (!isSuperAdmin) {
                router.push('/admin/power-tools');
                toast({
                    title: "Access Denied",
                    description: "This tool is restricted to Super Admins.",
                    variant: "destructive"
                });
            }
        }
    }, [isSuperAdmin, isUserLoading, isPermissionsLoading, router, toast]);

    const startCamera = useCallback(async () => {
        try {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }
            });

            setStream(newStream);
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
        } catch (err) {
            console.error("Error starting camera:", err);
            toast({
                title: "Camera Error",
                description: "Could not access camera. Please check permissions.",
                variant: "destructive"
            });
        }
    }, [stream, toast]);

    useEffect(() => {
        if (isSuperAdmin && !capturedImage) {
            startCamera();
        }
        return () => {
            if (stream) stream.getTracks().forEach(track => track.stop());
        };
    }, [isSuperAdmin, capturedImage, startCamera]);

    const takePicture = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Target ratio 1:1 (Square for coins)
        const targetRatio = 1 / 1;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = videoWidth;
        let sourceHeight = videoHeight;

        if (videoWidth > videoHeight) {
            // Video is wide, crop sides
            sourceWidth = videoHeight;
            sourceX = (videoWidth - sourceWidth) / 2;
        } else {
            // Video is tall, crop top/bottom
            sourceHeight = videoWidth;
            sourceY = (videoHeight - sourceHeight) / 2;
        }

        // Final canvas dimensions (efficient for AI)
        const canvasDim = 600;
        canvas.width = canvasDim;
        canvas.height = canvasDim;

        context.drawImage(
            video,
            sourceX, sourceY, sourceWidth, sourceHeight, // Source crop
            0, 0, canvasDim, canvasDim                  // Destination
        );

        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUri);

        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        // Auto-trigger AI fill
        handleAiFill(dataUri);
    };

    const handleAiFill = async (imageToAnalyze?: string) => {
        const img = imageToAnalyze || capturedImage;
        if (!img || !user) return;

        setIsAnalyzing(true);
        try {
            const idToken = await user.getIdToken();
            const result = await suggestListingDetails({
                photoDataUris: [img],
                idToken
            });

            if (result) {
                setFormData(prev => ({
                    ...prev,
                    title: result.title || prev.title,
                    price: result.price?.toString() || prev.price,
                    category: result.category || prev.category,
                    subCategory: result.subCategory || prev.subCategory,
                    condition: result.condition || prev.condition,
                    year: result.year?.toString() || prev.year,
                    // Use type casting or custom mapping if Coin specs are needed from AI
                    // The generic suggestListingDetails might need specific coin schema, 
                    // but for now we'll map common ones.
                    description: result.description || prev.description
                }));
                toast({
                    title: "AI Analysis Complete",
                    description: "Details filled successfully.",
                });
            }
        } catch (error) {
            console.error("AI Fill error:", error);
            toast({
                title: "AI Error",
                description: "Failed to analyze image.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = async () => {
        if (!user || !capturedImage) return;

        setIsSaving(true);
        try {
            const idToken = await user.getIdToken();
            const result = await quickSaveAndPublish(idToken, {
                ...formData,
                price: parseFloat(formData.price) || 0,
                quantity: 1,
            }, capturedImage);

            if (result.success) {
                setSessionCount(prev => prev + 1);
                setLastSaved(formData.title);
                toast({
                    title: "Coin Saved & Published!",
                    description: `Successfully added ${formData.title}`,
                });
                resetAndNext();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                title: "Save Failed",
                description: error.message,
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const resetAndNext = () => {
        setCapturedImage(null);
        setFormData({
            title: '',
            price: '',
            category: 'Coins',
            subCategory: 'Coins',
            condition: 'Good',
            year: '',
            denomination: '',
            mintMark: '',
            metal: '',
            description: ''
        });
        startCamera();
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    if (isUserLoading || isPermissionsLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-950">
                <Loader2 className="h-12 w-12 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30">
            {/* Session Header */}
            <div className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push('/admin/power-tools')}
                            className="text-slate-400 hover:text-white"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <div className="flex flex-col">
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Coins className="h-4 w-4 text-amber-400" />
                                MultiCoin Fast Lister
                            </h1>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Super Admin Power Tool</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                            <History className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-300">Last: <span className="text-amber-400 font-medium">{lastSaved || 'None'}</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-emerald-400" />
                            <span className="text-sm font-bold">{sessionCount} <span className="text-slate-500 font-normal">listed</span></span>
                        </div>
                    </div>
                </div>
            </div>

            <main className="container mx-auto px-4 py-6 max-w-7xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                    {/* Camera / Preview Section */}
                    <div className="space-y-4">
                        <div className="relative aspect-square rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl glass-effect">
                            <AnimatePresence mode="wait">
                                {!capturedImage ? (
                                    <motion.div
                                        key="camera"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0"
                                    >
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover"
                                        />
                                        <ARCameraOverlay guideType="coin" />
                                        <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
                                            <div className="w-full h-full border border-white/20 rounded-full" />
                                        </div>
                                        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                            <button
                                                onClick={takePicture}
                                                className="group relative w-20 h-20 rounded-full border-4 border-white/50 p-1 transition-all hover:scale-105 active:scale-95"
                                            >
                                                <div className="w-full h-full rounded-full bg-white shadow-xl group-hover:bg-amber-50" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="preview"
                                        initial={{ opacity: 0, scale: 1.1 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="absolute inset-0"
                                    >
                                        <img
                                            src={capturedImage}
                                            alt="Captured"
                                            className="w-full h-full object-contain bg-slate-900"
                                        />
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={retake}
                                                className="bg-slate-900/80 backdrop-blur-md border border-white/10"
                                            >
                                                <RotateCcw className="h-4 w-4 mr-2" />
                                                Retake
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                className="flex-1 h-14 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg shadow-lg shadow-amber-500/20"
                                onClick={takePicture}
                                disabled={!!capturedImage}
                            >
                                <Camera className="mr-2 h-6 w-6" />
                                Take 1:1 Picture
                            </Button>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <CardTitle className="text-xl">Coin Details</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs text-uppercase font-bold tracking-widest">Coin Title</Label>
                                        <Input
                                            placeholder="Year, Denomination, Mint Mark..."
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-slate-950/50 border-white/10 h-12 text-lg font-medium"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Price (AUD)</Label>
                                            <Input
                                                placeholder="0.00"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-12 text-emerald-400 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Condition</Label>
                                            <Input
                                                value={formData.condition}
                                                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-12"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Denomination</Label>
                                            <Input
                                                placeholder="$1, 50c..."
                                                value={formData.denomination}
                                                onChange={(e) => setFormData({ ...formData, denomination: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Mint Mark</Label>
                                            <Input
                                                placeholder="P, D, S..."
                                                value={formData.mintMark}
                                                onChange={(e) => setFormData({ ...formData, mintMark: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Metal</Label>
                                            <Input
                                                placeholder="Silver, Gold..."
                                                value={formData.metal}
                                                onChange={(e) => setFormData({ ...formData, metal: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Year</Label>
                                            <Input
                                                placeholder="1930"
                                                value={formData.year}
                                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col gap-3">
                                    <Button
                                        className="h-16 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xl shadow-xl shadow-amber-500/20"
                                        onClick={handleSave}
                                        disabled={!capturedImage || isSaving || !formData.title}
                                    >
                                        {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : 'SAVE & PUBLISH COIN'}
                                    </Button>

                                    <Button
                                        variant="ghost"
                                        onClick={() => handleAiFill()}
                                        disabled={!capturedImage || isAnalyzing}
                                        className="text-xs text-slate-500 hover:text-amber-400"
                                    >
                                        {isAnalyzing ? "AI Thinking..." : "Force AI Refill"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            <canvas ref={canvasRef} className="hidden" />
            <style jsx global>{`
                .glass-effect {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
            `}</style>
        </div>
    );
}
