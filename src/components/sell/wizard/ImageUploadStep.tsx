

'use client';

import { useRef, ChangeEvent, useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, Trash2, Sparkles, Loader2, ImagePlus, Smartphone, Pencil, Crosshair } from 'lucide-react';
import { CameraCapture } from '@/components/ui/camera-capture';
import { captureFrameKindFor } from '@/lib/photo-capture/frame';
import { useToast } from "@/hooks/use-toast";
import AICardGrader from '@/components/products/AICardGrader';
import { ThreeSixtyViewer } from '@/components/products/ThreeSixtyViewer';
import { cn } from "@/lib/utils/ui";
import { processListingImages } from "@/lib/utils/image";
import { PhotoEditorDialog } from '@/components/sell/PhotoEditorDialog';
import { focalCssPosition, normalizeFocalPoint, type ImageFocalPoint } from '@/lib/images/focal-point';
import { isLocalPhoto, type ListingPhoto } from '@/lib/images/listing-photos';

interface ImageUploadStepProps {
    /** The sell form's photos, in display order (index 0 is the main photo). */
    photos: ListingPhoto[];
    /** Set a photo's centre pin, or null to clear it. */
    onFocalChange?: (index: number, point: ImageFocalPoint | null) => void;
    onImagesChange: (files: File[], previews: string[], base64s: string[]) => void;
    onRemoveImage: (index: number) => void;
    /** Move a photo to a new position (0 makes it the main photo). */
    onMoveImage?: (from: number, to: number) => void;
    onAutoFill: () => Promise<void>;
    isAnalyzing: boolean;
    isRetrying?: boolean;
    analysisStage?: string;
    selectedType: 'sneakers' | 'streetwear' | 'accessories' | 'collector-cards' | 'general' | 'coins';
    onGradeComplete?: (grade: string) => void;
    onApplySuggestions?: (res: any) => void;
    onRotateImage?: (index: number) => void;
    /** Replace a not-yet-uploaded photo with a cropped copy. */
    onReplaceImage?: (index: number, file: File) => void | Promise<void>;
    form: any; // Passed for direct setValue if needed by sub-components
}

export function ImageUploadStep({
    photos,
    onImagesChange,
    onRemoveImage,
    onMoveImage,
    onAutoFill,
    isAnalyzing,
    isRetrying,
    analysisStage,
    selectedType,
    onGradeComplete,
    onApplySuggestions,
    onRotateImage,
    onReplaceImage,
    onFocalChange,
    form
}: ImageUploadStepProps) {
    const imageFiles = photos.map((p) => p.url ?? p.file);
    const imagePreviews = photos.map((p) => p.preview);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const nativeCameraInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [showing3D, setShowing3D] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    // The photo open in the editor, by id so it stays selected while photos move.
    const [editId, setEditId] = useState<string | null>(null);
    const editIndex = editId ? photos.findIndex((p) => p.id === editId) : -1;

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
            
            const compressedFiles = results.map((r: any) => r.file);
            const newPreviews = results.map((r: any) => r.previewUrl);
            const base64s = results.map((r: any) => r.base64ForAI);

            let currentTotalSize = photos.reduce((acc, p) => acc + (p.file?.size || 0), 0);
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

    const captureMode = captureFrameKindFor(selectedType);

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
                        <p className="text-sm font-bold text-foreground mt-4">Drop your photos here</p>
                        <p className="text-xs text-muted-foreground mt-1">Release to instantly add up to 8 photos</p>
                    </div>
                )}
                <CardHeader className="bg-muted/60 border-b border-border text-foreground p-5 rounded-t-xl">
                    <CardTitle className="text-lg flex items-center gap-2"><ImagePlus className="h-5 w-5" /> Gallery</CardTitle>
                    <CardDescription className="text-muted-foreground">Add up to 8 photos. Drag and drop, select files, or take pictures directly.</CardDescription>
                </CardHeader>
                <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                        <div
                             onClick={() => fileInputRef.current?.click()}
                             className="aspect-square rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-muted/60 cursor-pointer flex flex-col items-center justify-center transition-all group"
                        >
                            <div className="bg-primary/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Upload className="h-6 w-6 text-primary" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-medium mt-2 text-muted-foreground">Upload</span>
                            <input ref={fileInputRef} type="file" multiple accept="image/*" onChange={handleFileSelect} className="hidden" data-testid="photo-upload-input" />
                        </div>
                        <div
                             onClick={() => nativeCameraInputRef.current?.click()}
                             className="aspect-square rounded-2xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 hover:border-orange-500 hover:bg-orange-500/10 cursor-pointer flex flex-col items-center justify-center transition-all group relative"
                             title="Take high-resolution photo with full autofocus and macro support"
                        >
                            <span className="absolute -top-2 px-1.5 py-0.5 bg-orange-700 text-white text-[8px] font-black uppercase rounded-full tracking-wider shadow-sm">
                                Recommended
                            </span>
                            <div className="bg-orange-500/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                                <Smartphone className="h-6 w-6 text-orange-700" />
                            </div>
                            <span className="text-[10px] sm:text-xs font-bold mt-2 text-foreground text-center">Phone<br className="sm:hidden" /> Camera</span>
                            <input ref={nativeCameraInputRef} type="file" multiple accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />
                        </div>
                        <div className="aspect-square relative">
                            <CameraCapture onCapture={processFiles} captureMode={captureMode} variant="hero" maxFiles={8 - imageFiles.length} />
                            <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] sm:text-xs font-medium text-muted-foreground pointer-events-none hidden group-hover:block">Web Camera</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mt-4">
                        {photos.map(({ id, preview: p, focal }, i) => (
                            <div key={id} data-testid="sell-photo" className="relative aspect-square bg-card rounded-lg overflow-hidden border border-border group">
                                {/* A plain button: page scroll works over it, and tapping opens the photo editor. */}
                                <button
                                    type="button"
                                    onClick={(e) => { e.preventDefault(); setEditId(id); }}
                                    className="absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    aria-label={`Edit photo ${i + 1}${i === 0 ? ' (main photo)' : ''}`}
                                    data-testid="sell-photo-edit"
                                >
                                    <Image src={p} fill alt="" unoptimized className="object-cover" style={{ objectPosition: focalCssPosition(normalizeFocalPoint(focal)) }} sizes="160px" />
                                    {focal && (
                                        <span className="pointer-events-none absolute top-1 left-1 rounded-full bg-black/70 p-1 text-white" title="Centre set">
                                            <Crosshair aria-hidden className="h-3 w-3" />
                                            <span className="sr-only">Centre set</span>
                                        </span>
                                    )}
                                </button>
                                {i === 0 && (
                                    <span className="pointer-events-none absolute bottom-1 left-1 z-10 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">Main</span>
                                )}
                                <span aria-hidden className="pointer-events-none absolute bottom-1 right-1 z-10 rounded-full bg-black/70 p-1 text-white">
                                    <Pencil className="h-3 w-3" />
                                </span>
                                <button
                                    onClick={(e) => { e.preventDefault(); onRemoveImage(i); }}
                                    className="absolute top-1 right-1 z-10 p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors"
                                    type="button"
                                    aria-label={`Remove photo ${i + 1}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5 text-white" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {imagePreviews.length > 0 && (
                        <p className="text-[11px] text-muted-foreground">Tap a photo to set the item&apos;s centre, crop or rotate it. Tip: fill the frame on a plain background in good light.</p>
                    )}
                    <PhotoEditorDialog
                        photo={editIndex >= 0 ? photos[editIndex] : null}
                        index={editIndex}
                        count={photos.length}
                        cropKind={captureMode}
                        onClose={() => setEditId(null)}
                        onFocalChange={(point) => onFocalChange?.(editIndex, point)}
                        onRotate={onRotateImage ? () => onRotateImage(editIndex) : undefined}
                        onCrop={onReplaceImage ? (file) => onReplaceImage(editIndex, file) : undefined}
                        onMakeMain={onMoveImage ? () => onMoveImage(editIndex, 0) : undefined}
                        onRemove={() => { const i = editIndex; setEditId(null); onRemoveImage(i); }}
                    />


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
                            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 px-6 font-black shadow-lg shadow-primary/10 transition-all hover:scale-[1.02] active:scale-95"
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
                    <Card className="border border-orange-500/20 bg-orange-950/20 overflow-hidden shadow-sm rounded-2xl">
                        <CardHeader className="p-4 bg-orange-500/10 border-b border-orange-500/20 flex flex-row items-center justify-between">
                            <div className="space-y-0.5">
                                <CardTitle className="text-xs font-black text-orange-700 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles className="h-3.5 w-3.5" /> 360° Rotate Preview
                                </CardTitle>
                                <CardDescription className="text-[10px] text-orange-700/60">Drag or swipe to rotate listing photos in 3D.</CardDescription>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] font-bold border-orange-500/30 text-orange-700 bg-orange-500/5 hover:bg-orange-500/10 rounded-lg"
                                onClick={(e) => {
                                    e.preventDefault();
                                    setShowing3D(!showing3D);
                                }}
                            >
                                {showing3D ? "Hide 3D View" : "Show 3D View"}
                            </Button>
                        </CardHeader>
                        {showing3D && (
                            <CardContent className="p-4 bg-background/40">
                                <ThreeSixtyViewer imageUrls={imagePreviews} />
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}

            {selectedType === 'collector-cards' && (
                <AICardGrader
                    imageFiles={photos.filter(isLocalPhoto).map((p) => p.file as File)}
                    onGradeComplete={onGradeComplete}
                    onApplySuggestions={onApplySuggestions!}
                />
            )}
        </div>
    );
}

