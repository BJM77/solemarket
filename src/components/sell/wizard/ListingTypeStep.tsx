'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Upload, Loader2, Camera, Layers, ChevronRight, Footprints, RectangleVertical } from 'lucide-react';
import { cn } from "@/lib/utils/ui";
import { CameraCapture } from '@/components/ui/camera-capture';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ListingTypeStepProps {
    onSelect: (type: 'sneakers' | 'collector-cards' | 'coins') => void;
    selectedType: 'sneakers' | 'collector-cards' | 'coins' | null;
    onImagesSelect: (files: File[]) => void;
    isAnalyzing: boolean;
    analysisStage: string;
}

export function ListingTypeStep({ 
    onSelect, 
    selectedType,
    onImagesSelect,
    isAnalyzing,
    analysisStage
}: ListingTypeStepProps) {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            onImagesSelect(files);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files || []).filter(f => f.type.startsWith('image/'));
        if (files.length > 0) {
            onImagesSelect(files);
        }
    };

    const categories = [
        { type: 'sneakers' as const, label: 'Sneakers', note: 'Jordan, Nike, adidas and more', Icon: Footprints },
        { type: 'collector-cards' as const, label: 'Basketball Cards', note: 'Raw and graded NBA, WNBA, NBL', Icon: RectangleVertical },
    ];

    return (
        <div className="mx-auto max-w-2xl space-y-6 animate-in fade-in duration-300">
            <div className="space-y-1 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    Create a listing
                </h1>
                <p className="text-sm text-muted-foreground">
                    Add photos and we&apos;ll fill in the details, or pick a category to list manually.
                </p>
            </div>

            {/* AI photo listing (primary) */}
            <Card
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "rounded-2xl border bg-card shadow-sm transition-colors",
                    isDragging ? "border-primary ring-2 ring-primary/20" : "border-border",
                    isAnalyzing && "pointer-events-none"
                )}
            >
                <CardContent className="p-5 sm:p-6">
                    <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={isAnalyzing}
                    />

                    {isAnalyzing ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="space-y-1">
                                <h3 className="text-base font-semibold text-foreground">Reading your photos</h3>
                                <p className="text-sm text-muted-foreground">{analysisStage || 'Analysing photos...'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="flex items-start gap-4">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="text-base font-semibold text-foreground">List with photos</h3>
                                        <Badge variant="secondary" className="h-5 px-2 text-[10px] font-semibold uppercase tracking-wide">
                                            Recommended
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Add up to 4 photos. We&apos;ll detect the item and fill in the details. For cards, include the front and back.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <CameraCapture
                                    onCapture={(files) => onImagesSelect(files)}
                                    maxFiles={4}
                                    variant="custom"
                                >
                                    <Button type="button" size="lg" className="w-full">
                                        <Camera className="mr-2 h-4 w-4" />
                                        Take photo
                                    </Button>
                                </CameraCapture>
                                <Button
                                    type="button"
                                    size="lg"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload
                                </Button>
                            </div>
                            <p className="hidden text-center text-xs text-muted-foreground sm:block">
                                You can also drag photos onto this box.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ProLoad (secondary) */}
            <button
                type="button"
                onClick={() => router.push('/sell/proload')}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Layers className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">Import from Marketplace</span>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold uppercase">New</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Upload a Facebook Marketplace screenshot and we&apos;ll build the listing.</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>

            <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground">Or choose a category</span>
                <div className="h-px flex-1 bg-border" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {categories.map(({ type, label, note, Icon }) => {
                    const selected = selectedType === type;
                    return (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onSelect(type)}
                            aria-pressed={selected}
                            className={cn(
                                "flex w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left shadow-sm transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-col sm:items-start sm:gap-3",
                                selected ? "border-primary ring-2 ring-primary/20" : "border-border"
                            )}
                        >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                                <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <span className="block text-sm font-semibold text-foreground">{label}</span>
                                <span className="block text-xs text-muted-foreground">{note}</span>
                            </div>
                            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground sm:hidden" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
