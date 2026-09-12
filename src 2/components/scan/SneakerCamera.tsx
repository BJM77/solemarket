'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, RefreshCcw, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { validateImageQuality } from '@/lib/image-validation';

interface SneakerCameraProps {
    onCapture: (file: File) => void;
    isLoading?: boolean;
}

type ValidationStep = 'idle' | 'size' | 'resolution' | 'sharpness' | 'finalizing';

export function SneakerCamera({ onCapture, isLoading }: SneakerCameraProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [currentStep, setCurrentStep] = useState<ValidationStep>('idle');

    const processFile = async (file: File) => {
        setValidationError(null);
        
        setCurrentStep('size');
        if (file.size < 100 * 1024) {
            setValidationError("Image size too small. Please move closer and retake.");
            setCurrentStep('idle');
            return;
        }

        setCurrentStep('resolution');
        try {
            await new Promise(r => setTimeout(r, 400));
            
            setCurrentStep('sharpness');
            const result = await validateImageQuality(file, false);
            
            if (!result.isValid) {
                setValidationError(result.error || "Quality check failed.");
                setCurrentStep('idle');
                if (inputRef.current) inputRef.current.value = '';
                return;
            }

            setCurrentStep('finalizing');
            await new Promise(r => setTimeout(r, 300));
            
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

    const isValidating = currentStep !== 'idle';

    if (validationError) {
        return (
            <div className="w-full aspect-[4/3] max-w-md mx-auto border-2 border-red-500/20 bg-red-500/5 rounded-[32px] flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 shadow-2xl">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl relative border-2 border-red-50">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight uppercase">Quality Alert</h3>
                <p className="text-slate-600 text-sm mb-8 leading-relaxed font-bold">
                    {validationError}
                </p>
                <div className="space-y-4 w-full">
                    <Button 
                        onClick={() => {
                            setValidationError(null);
                            inputRef.current?.click();
                        }}
                        className="w-full h-16 font-black text-xl bg-primary hover:bg-primary/90 text-primary-foreground rounded-2xl shadow-xl"
                    >
                        <RefreshCcw className="w-6 h-6 mr-3" />
                        Retake Photo
                    </Button>
                    <button 
                        onClick={() => setValidationError(null)}
                        className="text-slate-400 text-xs font-black uppercase tracking-widest hover:text-slate-900 transition-colors"
                    >
                        Dismiss
                    </button>
                </div>
            </div>
        );
    }

    if (isValidating) {
        return (
            <div className="w-full aspect-[4/3] max-w-md mx-auto border-2 border-primary/20 bg-slate-900 rounded-[32px] flex flex-col items-center justify-center p-8 text-white text-center shadow-2xl">
                <div className="relative mb-10">
                    <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-primary animate-pulse" />
                </div>
                
                <h3 className="text-xl font-black uppercase tracking-widest mb-8">AI Quality Check</h3>
                
                <div className="w-full space-y-4 text-left max-w-[220px]">
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'size' || currentStep === 'resolution' || currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", currentStep !== 'size' ? "text-green-400" : "text-primary animate-pulse")} />
                        <span className="text-sm font-black uppercase tracking-tight">Format Scan</span>
                    </div>
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'resolution' || currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", (currentStep !== 'size' && currentStep !== 'resolution') ? "text-green-400" : "text-primary animate-pulse")} />
                        <span className="text-sm font-black uppercase tracking-tight">Resolution</span>
                    </div>
                    <div className={cn("flex items-center gap-3 transition-opacity duration-300", (currentStep === 'sharpness' || currentStep === 'finalizing') ? "opacity-100" : "opacity-20")}>
                        <CheckCircle2 className={cn("w-5 h-5", (currentStep === 'finalizing') ? "text-green-400" : "text-primary animate-pulse")} />
                        <span className="text-sm font-black uppercase tracking-tight">Blur Detection</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-[4/3] max-w-md mx-auto border-4 border-dashed rounded-[40px] transition-all overflow-hidden",
                isDragging ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50",
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

            <div className="flex flex-col items-center gap-6 p-10 text-center w-full">
                <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl flex items-center justify-center mb-2 border border-slate-100">
                    <Camera className="w-12 h-12 text-primary" />
                </div>
                
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none uppercase italic">Scan Kicks</h3>
                    <p className="text-sm text-slate-400 mt-4 font-black uppercase tracking-[0.2em]">Sneaker Authenticator</p>
                </div>

                <div className="w-full space-y-4 text-left bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-4 text-slate-700 font-black text-xs uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Bright Lighting Only</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-700 font-black text-xs uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Side Profile View</span>
                    </div>
                    <div className="flex items-center gap-4 text-slate-700 font-black text-xs uppercase tracking-tight">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span>Fill the entire frame</span>
                    </div>
                </div>

                <Button 
                    onClick={() => inputRef.current?.click()} 
                    className="w-full h-16 font-black text-xl rounded-2xl shadow-2xl shadow-primary/20"
                >
                    <Camera className="mr-3 h-6 w-6" />
                    Open Camera
                </Button>
                
                <button 
                    onClick={() => inputRef.current?.click()}
                    className="text-xs text-slate-400 font-black uppercase tracking-[0.15em] hover:text-primary transition-colors"
                >
                    Photo Library
                </button>
            </div>
        </div>
    );
}
