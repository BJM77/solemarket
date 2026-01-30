
'use client';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Image from 'next/image';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ProductImageLightboxProps {
    images: string[];
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
}

export function ProductImageLightbox({ images, isOpen, onOpenChange, title }: ProductImageLightboxProps) {
    const [index, setIndex] = useState(0);

    if (!images || images.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0 bg-black/95 border-none flex flex-col items-center justify-center">
                <DialogTitle className="sr-only">{title}</DialogTitle>
                <DialogDescription className="sr-only">Viewing large image of {title}</DialogDescription>

                <div className="relative w-full h-full flex items-center justify-center">
                    <Image
                        src={images[index]}
                        alt={title}
                        fill
                        className="object-contain"
                    />

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-50 h-10 w-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenChange(false);
                        }}
                    >
                        <X className="w-6 h-6" />
                    </Button>

                    {images.length > 1 && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12 z-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
                                }}
                            >
                                <ChevronLeft className="w-8 h-8" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full h-12 w-12 z-50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
                                }}
                            >
                                <ChevronRight className="w-8 h-8" />
                            </Button>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-medium z-50">
                                {index + 1} / {images.length}
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
