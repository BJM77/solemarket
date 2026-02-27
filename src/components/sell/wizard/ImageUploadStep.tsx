

'use client';

import { useRef, ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Trash2, Sparkles, Loader2, ImagePlus } from 'lucide-react';
import { CameraCapture } from '@/components/ui/camera-capture';
import imageCompression from 'browser-image-compression';
import { useToast } from "@/hooks/use-toast";
import AICardGrader from '@/components/products/AICardGrader';

interface ImageUploadStepProps {
    imageFiles: any[];
    imagePreviews: string[];
    onImagesChange: (files: File[], previews: string[]) => void;
    onRemoveImage: (index: number) => void;
    onAutoFill: () => Promise<void>;
    isAnalyzing: boolean;
    selectedType: 'sneakers' | 'streetwear' | 'accessories' | 'collector-cards' | 'general';
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
            maxSizeMB: 5,
            maxWidthOrHeight: 2560, // Increased resolution for better quality
            useWebWorker: true,
        };

        let currentTotalSize = imageFiles.reduce((acc, file) => acc + (file.size || 0), 0);
        const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB total

        for (const file of newFiles) {
            // Check individual file size limit (5MB) before compression if desired, 
            // but the user's request is to reduce the size of the pictures to 5MB.
            // Compression will handle this.

            try {
                const compressed = await imageCompression(file, options);

                if (currentTotalSize + compressed.size > MAX_TOTAL_SIZE) {
                    toast({
                        title: "Total listing size exceeded.",
                        description: "Maximum 20MB allowed for all photos in a listing.",
                        variant: "destructive"
                    });
                    break;
                }

                // Ensure we always store a File (not Blob) so instanceof File works later
                const compressedFile = compressed instanceof File
                    ? compressed
                    : new File([compressed], file.name, { type: file.type, lastModified: Date.now() });

                compressedFiles.push(compressedFile);
                newPreviews.push(URL.createObjectURL(compressedFile));
                currentTotalSize += compressedFile.size;
            } catch (error) {
                console.error('Image compression failed:', error);
                if (currentTotalSize + file.size > MAX_TOTAL_SIZE) {
                    toast({ title: "Total listing size exceeded.", variant: "destructive" });
                    break;
                }
                compressedFiles.push(file);
                newPreviews.push(URL.createObjectURL(file));
                currentTotalSize += file.size;
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


                </CardContent>
            </Card>

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
