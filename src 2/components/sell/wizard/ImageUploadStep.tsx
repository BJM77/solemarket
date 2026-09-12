

'use client';

import { useRef, ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Trash2, Sparkles, Loader2, ImagePlus, Smartphone, RotateCw } from 'lucide-react';
import { CameraCapture } from '@/components/ui/camera-capture';
import { useToast } from "@/hooks/use-toast";
import AICardGrader from '@/components/products/AICardGrader';
import { ThreeSixtyViewer } from '@/components/products/ThreeSixtyViewer';
import { cn, processListingImages } from '@/lib/utils';

interface ImageUploadStepProps {
    imageFiles: any[];
    imagePreviews: string[];
    onImagesChange: (files: File[], previews: string[], base64s: string[]) => void;
    onRemoveImage: (index: number) => void;
    onAutoFill: () => Promise<void>;
    isAnalyzing: boolean;
    isRetrying?: boolean;
    analysisStage?: string;
    selectedType: 'sneakers' | 'streetwear' | 'accessories' | 'collector-cards' | 'general' | 'coins';
    onGradeComplete?: (grade: string) => void;
    onApplySuggestions?: (res: any) => void;
    onRotateImage?: (index: number) => void;
    form: any; // Passed for direct setValue if needed by sub-components
}

export function ImageUploadStep({
    imageFiles,
    imagePreviews,
    onImagesChange,
    onRemoveImage,
    onAutoFill,
    isAnalyzing,
    isRetrying,
    analysisStage,
    selectedType,
    onGradeComplete,
    onApplySuggestions,
    onRotateImage,
    form
}: ImageUploadStepProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const nativeCameraInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [showing3D, setShowing3D] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []);
        const imageFilesOnly = files.filter(file => file.type.startsWith('image/'));
        
        if (imageFilesOnly.length > 0) {
            await processFiles(imageFilesOnly);
        } else if (files.length > 0) {
            toast({ title: "Only image files are allowed.", variant: "destructive" });
        }
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await processFiles(files);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const processFiles = async (newFiles: File[]) => {
        if (imageFiles.length + newFiles.length > 8) { // Increased limit for sneakers (angles)
            toast({ title: "Maximum 8 images allowed.", variant: "destructive" });
            return;
        }

        try {
            // Process the images in single-pass canvas pipeline
            const results = await processListingImages(newFiles);
            
            const compressedFiles = results.map(r => r.file);
            const newPreviews = results.map(r => r.previewUrl);
            const base64s = results.map(r => r.base64ForAI);

            let currentTotalSize = imageFiles.reduce((acc, file) => acc + (file.size || 0), 0);
            const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

            const filteredFiles: File[] = [];
            const filteredPreviews: string[] = [];
            const filteredBase64s: string[] = [];

            for (let i = 0; i < compressedFiles.length; i++) {
                const file = compressedFiles[i];
                if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
                    toast({
                        title: "Total listing size exceeded.",
                        description: "Maximum 20MB allowed for all photos in a listing.",
                        variant: "destructive"
                    });
                    break;
                }
                filteredFiles.push(file);
                filteredPreviews.push(newPreviews[i]);
                filteredBase64s.push(base64s[i]);
                currentTotalSize += file.size;
            }

            onImagesChange(filteredFiles, filteredPreviews, filteredBase64s);
        } catch (error) {
            console.error('Image compression failed:', error);
            toast({ title: "Image processing failed.", variant: "destructive" });
        }
    };

    const captureMode = ['cards', 'Collector Cards', 'trading-cards', 'Coins', 'coins'].includes(selectedType) ? 'card' : 'general';

    // Target aspect ratio display string
    const getTargetRatio = () => {
        switch (selectedType) {
            case 'sneakers': return '4:3';
            case 'streetwear': return '3:4';
            case 'accessories': return '1:1';
            case 'coins': return '1:1';
            default: return '1:1';
        }
    };

    return (
        <div className="space-y-6">

            <Card 
                className={cn(
                    "border shadow-md bg-card relative overflow-hidden transition-all duration-300",
                    isDragging ? "border-dashed border-primary ring-2 ring-primary/20 bg-primary/5 scale-[1.01]" : "border-transparent"
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-sm border-2 border-dashed border-primary rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-200">
                        <div className="bg-primary/20 p-4 rounded-full animate-bounce">
                            <Upload className="h-10 w-10 text-primary" />
                        </div>
                        <p className="text-sm font-bold text-white mt-4">Drop your photos here</p>
                        <p className="text-xs text-slate-400 mt-1">Release to instantly add up to 8 photos</p>
                    </div>
                )}
                <CardHeader className="bg-white/5 border-b border-white/10 text-white p-5 rounded-t-xl">
                    <CardTitle className="text-lg flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Gallery</CardTitle>
                    <CardDescription className="text-slate-400">Add up to 8 photos. Drag and drop, select files, or take pictures directly.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div
                             onClick={() => fileInputRef.current?.click()}
                             className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-primary hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center transition-all group"
                        >
                            <div className="bg-primary/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="h-6 w-6 text-primary" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium mt-2 text-slate-400">Upload</span>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </div>
                        <div
                             onClick={() => nativeCameraInputRef.current?.click()}
                             className="aspect-square rounded-2xl border-2 border-dashed border-white/20 hover:border-primary hover:bg-white/5 cursor-pointer flex flex-col items-center justify-center transition-all group"
                        >
                            <div className="bg-indigo-500/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Smartphone className="h-6 w-6 text-indigo-400" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium mt-2 text-slate-400 text-center">Native<br className="sm:hidden" /> Camera</span>
                            <input ref={nativeCameraInputRef} type="file" multiple accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                        </div>
                        <div className="aspect-square relative">
                            <CameraCapture onCapture={processFiles} captureMode={captureMode} variant="hero" maxFiles={8 - imageFiles.length} />
                            <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] sm:text-xs font-medium text-slate-400 pointer-events-none hidden group-hover:block">Web Camera</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {imagePreviews.map((p, i) => (
                            <div key={p} className="relative aspect-square bg-card rounded-lg overflow-hidden border border-white/10 group">
                                <Image src={p} fill alt={`Upload ${i + 1}`} className="object-cover" />
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {onRotateImage && (
                                        <button
                                            onClick={(e) => { e.preventDefault(); onRotateImage(i); }}
                                            className="p-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-full transition-colors"
                                            type="button"
                                            title="Rotate 90°"
                                        >
                                            <RotateCw className="h-4 w-4 text-white" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.preventDefault(); onRemoveImage(i); }}
                                        className="p-1.5 bg-red-600 hover:bg-red-500 rounded-full transition-colors"
                                        type="button"
                                        title="Remove Image"
                                    >
                                        <Trash2 className="h-4 w-4 text-white" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>


                </CardContent>
            </Card>

            {imageFiles.length > 0 && onAutoFill && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                        <div className="space-y-1">
                            <h4 className="font-bold text-primary flex items-center justify-center sm:justify-start gap-2">
                                <Sparkles className="h-4 w-4" /> AI Magic Available
                            </h4>
                            <p className="text-xs text-muted-foreground font-medium">
                                AI analyzes your first 3 photos (max 5) to auto-fill details.
                            </p>
                        </div>
                        <Button
                            onClick={(e) => { e.preventDefault(); onAutoFill(); }}
                            disabled={isAnalyzing}
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isAnalyzing ? (
                                <><Loader2 className="h-4 w-4 animate-spin mr-2" />{analysisStage || "Analyzing..."}</>
                            ) : (
                                <><Sparkles className="h-4 w-4 mr-2" />Auto-Fill All Details</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {imagePreviews.length >= 3 && (
                <div className="mt-4 animate-in fade-in duration-300">
                    <Card className="border border-indigo-500/20 bg-indigo-950/20 overflow-hidden shadow-sm rounded-2xl">
                        <CardHeader className="p-4 bg-indigo-500/10 border-b border-indigo-500/20 flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" /> 360° Rotate Preview
                                </CardTitle>
                                <CardDescription className="text-[10px] text-indigo-300/60">Drag or swipe to rotate listing photos in 3D.</CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] font-bold border-indigo-500/30 text-indigo-300 bg-indigo-500/5 hover:bg-indigo-500/10 rounded-lg"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowing3D(!showing3D);
                                }}
                            >
                                {showing3D ? "Hide 3D View" : "Show 3D View"}
                            </Button>
                        </CardHeader>
                        {showing3D && (
                            <CardContent className="p-4 bg-slate-950/40">
                                <ThreeSixtyViewer imageUrls={imagePreviews} />
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}

            {selectedType === 'collector-cards' && (
                <AICardGrader
                    imageFiles={imageFiles.filter(f => f instanceof File || f instanceof Blob)}
                    onGradeComplete={onGradeComplete}
                    onApplySuggestions={onApplySuggestions!}
                />
            )}
        </div>
    );
}

