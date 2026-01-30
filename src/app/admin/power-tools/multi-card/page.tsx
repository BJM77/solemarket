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
    Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { suggestListingDetails } from '@/ai/flows/suggest-listing-details';
import { quickSaveAndPublish } from '@/app/actions/multi-card';
import { ARCameraOverlay } from '@/components/ar-camera-overlay';
import { motion, AnimatePresence } from 'framer-motion';

export default function MultiCardPage() {
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

    // Form State (Flattened for speed)
    const [formData, setFormData] = useState({
        title: '',
        price: '',
        category: 'Collector Cards',
        subCategory: 'Trading Cards',
        condition: 'Near Mint',
        year: '',
        manufacturer: '',
        cardNumber: '',
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

        // Target ratio 5:7 (Portrait for cards)
        const targetRatio = 5 / 7;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = videoWidth;
        let sourceHeight = videoHeight;

        if (videoWidth / videoHeight > targetRatio) {
            // Video is too wide, crop sides
            sourceWidth = videoHeight * targetRatio;
            sourceX = (videoWidth - sourceWidth) / 2;
        } else {
            // Video is too tall, crop top/bottom
            sourceHeight = videoWidth / targetRatio;
            sourceY = (videoHeight - sourceHeight) / 2;
        }

        // Final canvas dimensions (keep it efficient for AI)
        const canvasHeight = 700;
        const canvasWidth = 500;

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        context.drawImage(
            video,
            sourceX, sourceY, sourceWidth, sourceHeight, // Source crop
            0, 0, canvasWidth, canvasHeight              // Destination
        );

        const dataUri = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUri);

        // Stop stream to save resources while reviewing
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }

        // Auto-trigger AI fill (Optimized for "Power Tool" speed)
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
                    manufacturer: result.manufacturer || prev.manufacturer,
                    cardNumber: result.cardNumber || prev.cardNumber,
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
                isReverseBidding: false,
                autoRepricingEnabled: false,
                isVault: false,
            }, capturedImage);

            if (result.success) {
                setSessionCount(prev => prev + 1);
                setLastSaved(formData.title);
                toast({
                    title: "Card Saved & Published!",
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
            category: 'Collector Cards',
            subCategory: 'Trading Cards',
            condition: 'Near Mint',
            year: '',
            manufacturer: '',
            cardNumber: '',
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
                <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!isSuperAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
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
                                <Zap className="h-4 w-4 text-indigo-400" />
                                MultiCard Fast Lister
                            </h1>
                            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Super Admin Power Tool</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-white/5">
                            <History className="h-3 w-3 text-slate-400" />
                            <span className="text-xs text-slate-300">Last: <span className="text-indigo-400 font-medium">{lastSaved || 'None'}</span></span>
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
                        <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black border border-white/10 shadow-2xl glass-effect">
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
                                        <ARCameraOverlay guideType="card" />
                                        <div className="absolute inset-0 border-[40px] border-black/20 pointer-events-none">
                                            <div className="w-full h-full border border-white/20 rounded-xl" />
                                        </div>
                                        <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                                            <button
                                                onClick={takePicture}
                                                className="group relative w-20 h-20 rounded-full border-4 border-white/50 p-1 transition-all hover:scale-105 active:scale-95"
                                            >
                                                <div className="w-full h-full rounded-full bg-white shadow-xl group-hover:bg-indigo-50" />
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
                                className="flex-1 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg shadow-lg shadow-indigo-500/20"
                                onClick={takePicture}
                                disabled={!!capturedImage}
                            >
                                <Camera className="mr-2 h-6 w-6" />
                                Take Picture
                            </Button>
                            <Button
                                variant="outline"
                                className="h-14 w-14 rounded-2xl border-white/10 bg-slate-900/50"
                                onClick={retake}
                                disabled={!capturedImage}
                            >
                                <RotateCcw className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Form Section */}
                    <div className="space-y-6">
                        <Card className="bg-slate-900/50 border-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl">
                            <CardHeader className="border-b border-white/5 bg-white/5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl">Card Details</CardTitle>
                                        <CardDescription className="text-slate-400 font-mono text-xs">Verify AI suggestions before saving</CardDescription>
                                    </div>
                                    {isAnalyzing && (
                                        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 animate-pulse">
                                            <Sparkles className="h-3 w-3 mr-1" />
                                            AI ANALYZING...
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-slate-400 text-xs">Listing Title</Label>
                                        <Input
                                            placeholder="Card name, year, grade..."
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="bg-slate-950/50 border-white/10 h-12 text-lg font-medium focus:ring-indigo-500/50"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Price (AUD)</Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</span>
                                                <Input
                                                    type="text"
                                                    placeholder="0.00"
                                                    value={formData.price}
                                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                                    className="bg-slate-950/50 border-white/10 pl-8 h-12 text-emerald-400 font-bold text-lg"
                                                />
                                            </div>
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

                                    <div className="grid grid-cols-3 gap-4 text-xs">
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Year</Label>
                                            <Input
                                                placeholder="2024"
                                                value={formData.year}
                                                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Brand</Label>
                                            <Input
                                                placeholder="Panini"
                                                value={formData.manufacturer}
                                                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">Card #</Label>
                                            <Input
                                                placeholder="101"
                                                value={formData.cardNumber}
                                                onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                                                className="bg-slate-950/50 border-white/10 h-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex flex-col gap-3">
                                    <Button
                                        variant="secondary"
                                        className="h-12 rounded-xl bg-white/5 hover:bg-white/10 border-white/5 text-slate-300"
                                        onClick={() => handleAiFill()}
                                        disabled={!capturedImage || isAnalyzing}
                                    >
                                        {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                        Force AI Auto Fill
                                    </Button>

                                    <Button
                                        className="h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xl shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
                                        onClick={handleSave}
                                        disabled={!capturedImage || isSaving || !formData.title}
                                    >
                                        {isSaving ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <>
                                                <Save className="mr-3 h-6 w-6" />
                                                SAVE & PUBLISH
                                            </>
                                        )}
                                    </Button>

                                    <p className="text-[10px] text-center text-slate-500 font-medium">
                                        Clicking save will instantly list the card and return to camera
                                    </p>
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
