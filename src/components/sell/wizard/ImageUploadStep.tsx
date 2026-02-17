

'use client';

import { useRef, ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Trash2, Sparkles, Loader2, ImagePlus } from 'lucide-react';
import { CameraCapture } from '@/components/ui/camera-capture';
import imageCompression from 'browser-image-compression';
import { useToast } from "@/hooks/use-toast";
// import EnhancedAICardGrader from '@/components/products/EnhancedAICardGrader'; // Removed for Benched

interface ImageUploadStepProps {
    imageFiles: any[];
    imagePreviews: string[];
    onImagesChange: (files: File[], previews: string[]) => void;
    onRemoveImage: (index: number) => void;
    onAutoFill: () => Promise<void>;
    isAnalyzing: boolean;
    selectedType: 'sneakers' | 'streetwear' | 'accessories' | 'general';
    onGradeComplete?: (grade: string) => void;
    onApplySuggestions?: (res: any) => void;
    form: any; // Passed for direct setValue if needed by sub-components
}

export function ImageUploadStep({
    imageFiles,
    imagePreviews,
    onImagesChange,
    onRemoveImage,
    onAutoFill,
    isAnalyzing,
    selectedType,
    onGradeComplete,
    onApplySuggestions,
    form
}: ImageUploadStepProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

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

        const compressedFiles: File[] = [];
        const newPreviews: string[] = [];

        const options = {
            maxSizeMB: 1.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
        };

        for (const file of newFiles) {
            try {
                const compressedFile = await imageCompression(file, options);
                compressedFiles.push(compressedFile);
                newPreviews.push(URL.createObjectURL(compressedFile));
            } catch (error) {
                console.error('Image compression failed:', error);
                compressedFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
            }
        }

        onImagesChange(compressedFiles, newPreviews);
    };

    const captureMode = 'general'; // Defaulting to general for now

    // Target aspect ratio display string
    const getTargetRatio = () => {
        switch (selectedType) {
            case 'sneakers': return '4:3';
            case 'streetwear': return '3:4';
            case 'accessories': return '1:1';
            default: return '1:1';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Upload Photos</h2>
                <p className="text-muted-foreground">High quality photos sell faster. Target Ratio: {getTargetRatio()}</p>
            </div>

            <Card className="border-0 shadow-md">
                <CardHeader className="bg-slate-900 text-white p-5 rounded-t-xl">
                    <CardTitle className="text-lg flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Gallery</CardTitle>
                    <CardDescription className="text-slate-400">Add up to 8 photos.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-primary hover:bg-primary/5 cursor-pointer flex flex-col items-center justify-center transition-colors"
                        >
                            <Upload className="h-8 w-8 text-primary mb-2" />
                            <span className="text-xs font-medium text-slate-600">Select Files</span>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </div>
                        <div className="aspect-square">
                            <CameraCapture onCapture={processFiles} captureMode={captureMode} variant="hero" maxFiles={8 - imageFiles.length} />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {imagePreviews.map((p, i) => (
                            <div key={p} className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden border group">
                                <Image src={p} fill alt={`Upload ${i + 1}`} className="object-cover" />
                                <button
                                    onClick={() => onRemoveImage(i)}
                                    className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    type="button"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        ))}
                    </div>

                    {imageFiles.length > 0 && (
                        <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Sparkles className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-semibold text-indigo-900">AI Analysis Available</h4>
                                    <p className="text-xs text-indigo-700">We can auto-fill listing details from your photos.</p>
                                </div>
                                <Button onClick={onAutoFill} disabled={isAnalyzing} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Auto-Fill
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Grading component removed for Benched rebrand */}
        </div>
    );
}
