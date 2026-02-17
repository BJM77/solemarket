'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SneakerCameraProps {
    onCapture: (file: File) => void;
    isLoading?: boolean;
}

export function SneakerCamera({ onCapture, isLoading }: SneakerCameraProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onCapture(e.target.files[0]);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            onCapture(e.dataTransfer.files[0]);
        }
    };

    return (
        <div
            className={cn(
                "relative flex flex-col items-center justify-center w-full aspect-[4/3] max-w-md mx-auto border-2 border-dashed rounded-2xl transition-all overflow-hidden bg-muted/30",
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
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
                capture="environment" // Prefers rear camera on mobile
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-2">
                    <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h3 className="text-lg font-bold">Scan Your Kicks</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Take a photo or upload an image <br /> to auto-detect details.
                    </p>
                </div>
                <div className="flex gap-3 mt-2">
                    <Button 
                        onClick={() => inputRef.current?.click()} 
                        size="lg" 
                        className="font-bold shadow-md"
                    >
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                    </Button>
                    <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={() => inputRef.current?.click()}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                    </Button>
                </div>
            </div>
        </div>
    );
}
