'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, AlertCircle, RefreshCcw, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { validateImageQuality } from '@/lib/image-validation';

interface CardCameraProps {
    onCapture: (file: File) => void;
    isLoading?: boolean;
}

type ValidationStep = 'idle' | 'size' | 'resolution' | 'sharpness' | 'finalizing';

export function CardCamera({ onCapture, isLoading }: CardCameraProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<ValidationStep>('idle');

    const processFile = async (file: File) => {
        setValidationError(null);
        
        // 1. Size Check (Immediate)
        setCurrentStep('size');
        if (file.size < 100 * 1024) {
            setValidationError("Image size too small. Please move closer and retake.");
            setCurrentStep('idle');
            return;
        }

        // 2. Resolution & Advanced Checks
        setCurrentStep('resolution');
        try {
            // Give UI a moment to breathe so the user sees the steps
            await new Promise(r => setTimeout(r, 400));
            
            setCurrentStep('sharpness');
            const result = await validateImageQuality(file, true);
            
            if (!result.isValid) {
                setValidationError(result.error || "Quality check failed.");
                setCurrentStep('idle');
                if (inputRef.current) inputRef.current.value = '';
                return;
            }

            setCurrentStep('finalizing');
            await new Promise(r => setTimeout(r, 300));
            
            // Image passed all checks
            onCapture(file);
            setCurrentStep('idle');
        } catch (e) {
            console.error("Validation error", e);
            onCapture(file);
            setCurrentStep('idle');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    // If we are currently validating, show a "Scanning..." state
    const isValidating = currentStep !== 'idle';

    if (validationError) {
        return (
            <div className="w-full aspect-[2.5/3.5] max-w-sm mx-auto border-2 border-red-500/20 bg-red-500/5 rounded-3xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300 shadow-2xl shadow-red-500/5">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl relative">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                    <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-pulse"></div>
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Quality Warning</h3>
                <p className="text-slate-600 text-sm mb-8 leading-relaxed font-medium">
                    {validationError}
                </p>
                <div className="space-y-4 w-full">
                    <Button 
                        onClick={() => {
                            setValidationError(null);
                            inputRef.current?.click();
                        }}
                        className="w-full h-14 font-black text-lg bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-lg"
                    >
                        <RefreshCcw className="w-5 h-5 mr-3" />
                        Try Again
                    </Button>
                    <button 
                        onClick={() => setValidationError(null)}
                        className="text-slate-400 text-xs font-bold uppercase tracking-widest hover:text-slate-600"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        );
    }

    if (isValidating) {
        return (
            <div className="w-full aspect-[2.5/3.5] max-w-sm mx-auto border-2 border-indigo-500/20 bg-slate-900 rounded-3xl flex flex-col items-center justify-center p-8 text-white text-center shadow-2xl">
                <div className="relative mb-10">
                    <div className="w-24 h-24 rounded-full border-4 border-indigo-500/20 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-widest mb-6">Scanning Quality</h3>
                
                <div className="w-full space-y-4 text-left max-w-[200px]">
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'size' || currentStep === 'resolution' || currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", currentStep !== 'size' ? "text-green-400" : "text-indigo-400 animate-pulse")} />
                        <span className="text-sm font-bold tracking-tight">File integrity</span>
                    </div>
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'resolution' || currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", (currentStep !== 'size' && currentStep !== 'resolution') ? "text-green-400" : "text-indigo-400 animate-pulse")} />
                        <span className="text-sm font-bold tracking-tight">Resolution check</span>
                    </div>
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", (currentStep === 'finalizing') ? "text-green-400" : "text-indigo-400 animate-pulse")} />
                        <span className="text-sm font-bold tracking-tight">Sharpness test</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-[2.5/3.5] max-w-sm mx-auto border-4 border-dashed rounded-[32px] transition-all overflow-hidden",
                isDragging ? "border-indigo-500 bg-indigo-500/5" : "border-slate-200 bg-slate-50",
                isLoading && "opacity-50 pointer-events-none"
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-4 p-8 text-center w-full">
                <div className="w-20 h-20 bg-white rounded-[24px] shadow-xl flex items-center justify-center mb-4 border border-slate-100">
                    <Camera className="w-10 h-10 text-slate-900" />
                </div>
                
                <div className="mb-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Smart Scan</h3>
                    <p className="text-sm text-slate-400 mt-3 font-bold uppercase tracking-widest">Collector Card Mode</p>
                </div>

                <div className="w-full space-y-3 text-left bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-bold leading-tight">Use bright daylight</p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-bold leading-tight">Tap screen to <strong>Focus</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                        </div>
                        <p className="text-xs text-slate-600 font-bold leading-tight">Center card in frame</p>
                    </div>
                </div>

                <Button 
                    onClick={() => inputRef.current?.click()} 
                    className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl rounded-2xl shadow-xl shadow-indigo-100 mt-4"
                >
                    <Camera className="mr-3 h-6 w-6" />
                    Take Photo
                </Button>
                
                <button 
                    onClick={() => inputRef.current?.click()}
                    className="text-xs text-slate-400 font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                >
                    Upload Gallery
                </button>
            </div>
        </div>
    );
}
