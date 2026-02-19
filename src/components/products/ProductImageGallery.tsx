
"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center', transform: 'scale(1)' });

  // Update selected index when embla carousel changes
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    // Sync external selectedIndex changes
    if (emblaApi.selectedScrollSnap() !== selectedIndex) {
      emblaApi.scrollTo(selectedIndex);
    }
  }, [emblaApi, onSelect, selectedIndex]);

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

  const scrollPrev = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const goToSlide = (index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
    setSelectedIndex(index);
  };

  const goToPreviousFullscreen = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  }, [images.length]);

  const goToNextFullscreen = useCallback((e?: React.MouseEvent | KeyboardEvent) => {
    e?.stopPropagation();
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  }, [images.length]);


  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          goToPreviousFullscreen(e);
          break;
        case 'ArrowRight':
          goToNextFullscreen(e);
          break;
        case 'Escape':
          setIsFullscreen(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, goToPreviousFullscreen, goToNextFullscreen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.0)',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({
      transformOrigin: 'center',
      transform: 'scale(1)',
    });
  };

  if (!images || images.length === 0) {
    return (
      <div className={cn("relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-gray-400", aspectRatio)}>
        <div className="flex flex-col items-center">
          <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
          <span className="text-xs font-medium">No Image Available</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Main Carousel */}
        <div className={cn("relative bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden group border border-gray-100 dark:border-gray-700", aspectRatio)}>

          {/* Embla Viewport */}
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full touch-pan-y">
              {images.map((src, index) => (
                <div className="flex-[0_0_100%] min-w-0 relative h-full" key={index}>
                  <div
                    className="relative w-full h-full cursor-zoom-in"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => setIsFullscreen(true)}
                  >
                    <Image
                      src={src}
                      alt={`${title} - Image ${index + 1}`}
                      fill
                      className="object-contain sm:object-cover"
                      style={index === selectedIndex ? zoomStyle : undefined}
                      priority={index === 0}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 800px"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full h-9 w-9 z-10 hidden sm:flex"
                onClick={scrollPrev}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-white rounded-full h-9 w-9 z-10 hidden sm:flex"
                onClick={scrollNext}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </>
          )}

          {/* Fullscreen Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 hover:bg-black/40 text-white rounded-full h-8 w-8 z-10"
            onClick={(e) => { e.stopPropagation(); setIsFullscreen(true); }}
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          {/* Badges Overlay */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-10">
            {condition && (
              <Badge className={cn("border-none shadow-sm", conditionColors[condition] || 'bg-gray-100 text-gray-800')}>
                {condition}
              </Badge>
            )}
            {isAuthenticated && (
              <Badge className="bg-blue-600 text-white border-none shadow-sm">
                <ShieldCheck className="h-3 w-3 mr-1" />
                Auth
              </Badge>
            )}
          </div>

          {/* Dots Indicator */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
              {images.map((_, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-300 shadow-sm",
                    index === selectedIndex ? "bg-white w-4" : "bg-white/50"
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all",
                  index === selectedIndex ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-gray-200'
                )}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Viewer */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 bg-black border-none shadow-none flex flex-col focus:outline-none">
          <DialogTitle className="sr-only">
            Full-screen view of {title}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Viewing image {selectedIndex + 1} of {images.length}.
          </DialogDescription>

          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden touch-none">
            <div className="relative w-full h-full">
              <Image
                src={images[selectedIndex]}
                alt={`${title} - Fullscreen`}
                fill
                sizes="100vw"
                className="object-contain"
                priority
              />
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white/80 hover:bg-white/20 hover:text-white rounded-full h-10 w-10 z-50"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-6 h-6" />
            </Button>

            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full z-40"
                  onClick={goToPreviousFullscreen}
                >
                  <ChevronLeft className="w-8 h-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white hover:bg-white/10 h-12 w-12 rounded-full z-40"
                  onClick={goToNextFullscreen}
                >
                  <ChevronRight className="w-8 h-8" />
                </Button>
              </>
            )}

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-white text-sm font-medium border border-white/10">
              {selectedIndex + 1} / {images.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
