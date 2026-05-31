'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GripVertical, Scan, Sparkles, Upload, Loader2, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CameraCapture } from '@/components/ui/camera-capture';
import { Button } from '@/components/ui/button';

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

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                    Create a New Listing
                </h1>
                <p className="text-slate-400 max-w-md mx-auto text-sm sm:text-base">
                    Let our AI automatically build your listing, or select a category below to list manually.
                </p>
            </div>

            {/* AI Picture Check Hero Card */}
            <Card 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    "relative overflow-hidden transition-all duration-500 border-2 border-dashed bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-950/60 shadow-2xl rounded-3xl group",
                    isDragging ? "border-primary scale-[1.01] bg-primary/5 ring-4 ring-primary/10" : "border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-indigo-900/20",
                    isAnalyzing && "pointer-events-none border-purple-500/50"
                )}
            >
                {/* Glowing neon background elements */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700 pointer-events-none" />
                <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all duration-700 pointer-events-none" />

                <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
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
                        <div className="space-y-6 py-6 animate-pulse">
                            <div className="relative flex justify-center">
                                <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl animate-ping w-20 h-20 mx-auto" />
                                <div className="relative bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-full border border-white/20 shadow-2xl flex items-center justify-center">
                                    <Loader2 className="h-10 w-10 text-white animate-spin" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-white flex items-center justify-center gap-2">
                                    <Sparkles className="h-5 w-5 text-indigo-400 animate-pulse" /> AI Picture Check Active
                                </h3>
                                <p className="text-indigo-200 font-bold uppercase tracking-widest text-xs animate-pulse">
                                    {analysisStage || "Analyzing Photos..."}
                                </p>
                                <p className="text-slate-400 text-xs max-w-xs mx-auto">
                                    Our vision models are identifying details, conditions, and catalog numbers.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 py-4 w-full">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all w-24 h-24 pointer-events-none" />
                                <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-2xl border border-white/20 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                    <Sparkles className="h-10 w-10 text-white" />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">
                                    ✨ AI Picture Check (Recommended)
                                </h3>
                                <p className="text-slate-300 text-sm max-w-sm mx-auto font-medium">
                                    Take a photo, upload, or drag-and-drop photos here. The AI will auto-detect the category and pre-fill details in seconds!
                                </p>
                                <div className="pt-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[10px] sm:text-xs font-bold text-indigo-300 uppercase tracking-wider">
                                        Supports front & back card shots for max accuracy
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mx-auto mt-8 pt-4">
                                <CameraCapture 
                                    onCapture={(files) => onImagesSelect(files)} 
                                    maxFiles={4} 
                                    variant="custom"
                                >
                                    <Button 
                                        type="button" 
                                        size="lg"
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-900/20"
                                    >
                                        <Camera className="w-5 h-5 mr-2" />
                                        Take Photo
                                    </Button>
                                </CameraCapture>
                                <Button 
                                    type="button" 
                                    size="lg"
                                    variant="outline"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm"
                                >
                                    <Upload className="w-5 h-5 mr-2" />
                                    Upload Images
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Manual Entry Divider */}
            <div className="relative flex py-4 items-center max-w-md mx-auto">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Or List Manually</span>
                <div className="flex-grow border-t border-white/10"></div>
            </div>

            {/* Manual Fallbacks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
                        selectedType === 'sneakers'
                            ? 'border-primary ring-2 ring-primary/20 bg-card'
                            : 'border-white/10 hover:border-white/30 bg-card'
                    }`}
                    onClick={() => onSelect('sneakers')}
                >
                    <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
                        <div className={`w-12 h-12 border-2 rounded bg-white/5 ${selectedType === 'sneakers' ? 'border-white' : 'border-orange-600 group-hover:border-white'}`} />
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">Sneakers</h3>
                            <p className="text-xs text-slate-400">Jordan, Yeezy, Nike, etc.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
                        selectedType === 'collector-cards'
                            ? 'border-primary ring-2 ring-primary/20 bg-card'
                            : 'border-white/10 hover:border-white/30 bg-card'
                    }`}
                    onClick={() => onSelect('collector-cards')}
                >
                    <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-12 h-16 border-2 border-indigo-600 bg-white/5 rounded flex items-center justify-center group-hover:border-white transition-colors">
                            <Scan className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">Collector Cards</h3>
                            <p className="text-xs text-slate-400">NBA & Basketball sets.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className={`relative cursor-pointer transition-all duration-300 overflow-hidden group hover:-translate-y-1 ${
                        selectedType === 'coins'
                            ? 'border-primary ring-2 ring-primary/20 bg-card'
                            : 'border-white/10 hover:border-white/30 bg-card'
                    }`}
                    onClick={() => onSelect('coins')}
                >
                    <CardContent className="p-6 md:p-8 flex flex-col items-center text-center space-y-4">
                        <div className="w-16 h-16 border-2 border-yellow-500 bg-white/5 rounded-full flex items-center justify-center group-hover:border-white transition-colors">
                            <GripVertical className="w-8 h-8 text-yellow-500 group-hover:text-white transition-colors rotate-90" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-white">Coins</h3>
                            <p className="text-xs text-slate-400">Rare Coins & Banknotes.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
