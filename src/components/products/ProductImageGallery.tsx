
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface ProductImageGalleryProps {
  images: string[];
  title: string;
  isCard: boolean;
  condition?: string;
  isAuthenticated?: boolean;
  category?: string;
}

const conditionColors: Record<string, string> = {
  'Mint': 'bg-green-100 text-green-800 border-green-200',
  'Near Mint': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Excellent': 'bg-blue-100 text-blue-800 border-blue-200',
  'Good': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Fair': 'bg-orange-100 text-orange-800 border-orange-200',
  'Poor': 'bg-red-100 text-red-800 border-red-200',
};

export default function ProductImageGallery({ images = [], title, isCard, condition, isAuthenticated, category }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center', transform: 'scale(1)' });

  const getAspectRatio = (cat?: string) => {
    switch (cat) {
      case 'Coins':
        return 'aspect-square';
      case 'Memorabilia':
      case 'Collectibles':
      case 'General':
        return 'aspect-video';
      case 'Collector Cards':
      default:
        return 'aspect-[5/7]';
    }
  };

  const aspectRatio = getAspectRatio(category);

  const goToPrevious = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNext = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);

  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPrevious(e);
          break;
        case 'ArrowRight':
          goToNext(e);
          break;
        case 'Escape':
          setIsFullscreen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, goToPrevious, goToNext]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.0)', // 2x Zoom
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: 'center',
      transform: 'scale(1)',
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Main Image */}
        <div
          className={cn("relative bg-gray-100 rounded-lg overflow-hidden group cursor-zoom-in", aspectRatio)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={() => setIsFullscreen(true)}
        >
          <AnimatePresence mode="wait">
            {images.length > 0 ? (
              <motion.div
                key={selectedIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative w-full h-full pointer-events-none"
              >
                <Image
                  src={images[selectedIndex]}
                  alt={`${title} - Image ${selectedIndex + 1}`}
                  fill
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                  style={zoomStyle}
                  priority={selectedIndex === 0}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  placeholder="blur"
                  blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
                />
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                <span className="text-xs font-medium">No Image Available</span>
              </div>
            )}
          </AnimatePresence>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full h-9 w-9 z-10"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full h-9 w-9 z-10"
                onClick={goToNext}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full h-9 w-9 z-10"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
          >
            <Maximize2 className="w-5 h-5" />
          </Button>

          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
            {condition && (
              <Badge className={cn("border-none", conditionColors[condition] || 'bg-gray-100')}>
                {condition}
              </Badge>
            )}
            {isAuthenticated && (
              <Badge className="bg-blue-100 text-blue-800 border-blue-200 border-none">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Authenticated
              </Badge>
            )}
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs pointer-events-none z-10">
              {selectedIndex + 1} / {images.length}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => setSelectedIndex(index)}
                className={`
                  relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all
                  ${index === selectedIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-300'}
                `}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  sizes="80px"
                  placeholder="blur"
                  blurDataURL="data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAADQAQCdASoIAAgAAUAmJaQAA3AA/v79ggAA"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 border-none shadow-none flex flex-col">
          <DialogTitle className="sr-only">
            Full-screen view of {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Viewing image {selectedIndex + 1} of {images.length}. Use arrow buttons or arrow keys to navigate.
          </DialogDescription>

          <div className="relative flex-1 w-full flex items-center justify-center overflow-hidden">
            <Image
              src={images[selectedIndex]}
              alt={`${title} - Fullscreen`}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-10 w-10 z-50"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Navigation in Fullscreen */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full z-40"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12 rounded-full z-40"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}
          </div>

          {/* Fullscreen Thumbnails */}
          {images.length > 1 && (
            <div className="h-24 bg-black/50 flex items-center justify-center p-4 border-t border-white/10">
              <div className="flex gap-4 overflow-x-auto max-w-full px-4 scrollbar-hide">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={`
                        relative flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 transition-all
                        ${index === selectedIndex ? 'border-white ring-2 ring-white/50' : 'border-transparent opacity-50 hover:opacity-100'}
                        `}
                  >
                    <Image
                      src={image}
                      alt={`Thumb ${index}`}
                      fill
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
