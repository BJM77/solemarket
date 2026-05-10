'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, AlertCircle, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { validateImageQuality } from '@/lib/image-validation';

interface SneakerCameraProps {
    onCapture: (file: File) => void;
    isLoading?: boolean;
}

export function SneakerCamera({ onCapture, isLoading }: SneakerCameraProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isValidating, setIsValidating] = useState(false);

    const processFile = async (file: File) => {
        setIsValidating(true);
        setValidationError(null);

        try {
            const result = await validateImageQuality(file, false);
            
            if (!result.isValid) {
                setValidationError(result.error || "Image quality check failed.");
                setIsValidating(false);
                if (inputRef.current) inputRef.current.value = ''; // Reset input
                return;
            }

            // Image passed validation
            onCapture(file);
        } catch (e) {
            console.error("Validation error", e);
            onCapture(file);
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

    if (validationError) {
        return (
            <div className="w-full aspect-[4/3] max-w-md mx-auto border-2 border-red-500/20 bg-red-500/5 rounded-2xl flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Quality Warning</h3>
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {validationError}
                </p>
                <div className="space-y-3 w-full">
                    <Button 
                        onClick={() => {
                            setValidationError(null);
                            inputRef.current?.click();
                        }}
                        className="w-full h-12 font-bold bg-slate-900 hover:bg-slate-800"
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        Retake Photo
                    </Button>
                    <Button 
                        variant="ghost" 
                        onClick={() => setValidationError(null)}
                        className="w-full"
                    >
                        Cancel
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-[4/3] max-w-md mx-auto border-2 border-dashed rounded-2xl transition-all overflow-hidden bg-slate-50",
                isDragging ? "border-primary bg-primary/5" : "border-slate-200",
                (isLoading || isValidating) && "opacity-50 pointer-events-none"
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

            <div className="flex flex-col items-center gap-4 p-6 text-center w-full">
                <div className="p-4 bg-white rounded-full shadow-md mb-2 relative">
                    <Camera className="w-8 h-8 text-primary" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                    </div>
                </div>
                
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Scan Your Kicks</h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                        For perfect AI detection:
                    </p>
                </div>

                <div className="w-full space-y-2 text-left bg-white/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-primary font-bold">•</span>
                        <span>Use bright, natural daylight</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-primary font-bold">•</span>
                        <span>Ensure the <strong>whole shoe</strong> is visible</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="text-primary font-bold">•</span>
                        <span>Side profile works best</span>
                    </div>
                </div>

                <div className="flex gap-3 w-full mt-2">
                    <Button 
                        onClick={() => inputRef.current?.click()} 
                        className="flex-1 h-12 font-bold shadow-lg"
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        {isValidating ? "Checking..." : "Take Photo"}
                    </Button>
                </div>
                <button 
                    onClick={() => inputRef.current?.click()}
                    className="text-xs text-slate-400 font-medium hover:text-slate-600 underline underline-offset-2"
                >
                    Or select from gallery
                </button>
            </div>
        </div>
    );
}
