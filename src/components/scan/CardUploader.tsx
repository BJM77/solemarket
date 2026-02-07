'use client';

import { useState, useCallback } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CardUploaderProps {
    onImageSelect: (file: File) => void;
    isLoading?: boolean;
}

export default function CardUploader({ onImageSelect, isLoading }: CardUploaderProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        onImageSelect(file);
    }, [onImageSelect]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    }, [handleFile]);

    return (
        <div className="space-y-4">
            <Label className="text-sm font-semibold">Upload Card Photo</Label>

            <div
                className={`relative border-2 border-dashed rounded-xl p-8 transition-all ${dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {preview ? (
                    <div className="space-y-4">
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-muted">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setPreview(null);
                                const input = document.getElementById('card-upload') as HTMLInputElement;
                                if (input) input.value = '';
                            }}
                            disabled={isLoading}
                        >
                            Change Image
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Upload className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium mb-1">
                                Drag & drop your card photo here
                            </p>
                            <p className="text-xs text-muted-foreground">
                                or click to browse
                            </p>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p>📸 Best results with 20-30 cards in a grid layout</p>
                            <p>💡 Good lighting and flat surface recommended</p>
                        </div>
                    </div>
                )}

                <Input
                    id="card-upload"
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleChange}
                    disabled={isLoading}
                />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
                <span>Supports: JPG, PNG, HEIC (max 10MB)</span>
            </div>
        </div>
    );
}
