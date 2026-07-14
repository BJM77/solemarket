
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Maximize2, X, Image as ImageIcon, ShieldCheck, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProductImageGalleryProps {
  images: string[];
  videoUrl?: string;
  videoThumbnailUrl?: string;
  title: string;
  isCard: boolean;
  condition?: string;
  isAuthenticated?: boolean;
  category?: string;
  imageAltTexts?: string[];
}

const conditionColors: Record<string, string> = {
  'Mint': 'bg-green-100 text-green-800 border-green-200',
  'Near Mint': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Excellent': 'bg-blue-100 text-blue-800 border-blue-200',
  'Good': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Fair': 'bg-orange-100 text-orange-800 border-orange-200',
  'Poor': 'bg-red-100 text-red-800 border-red-200',
};

const BLUR_DATA_URL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiB2aWV3Qm94PSIwIDAgMTAwIDEwMCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2YxZjVmOSIvPjwvc3ZnPg==";

export default function ProductImageGallery({ 
  images = [], 
  videoUrl,
  videoThumbnailUrl,
  title, 
  isCard, 
  condition, 
  isAuthenticated, 
  category,
  imageAltTexts = []
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, skipSnaps: false });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFullZoom, setIsFullZoom] = useState(false);
  const [zoomStyle, setZoomStyle] = useState({ transformOrigin: 'center', transform: 'scale(1)' });
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Reset full zoom when slide changes or fullscreen closes
  useEffect(() => {
    setIsFullZoom(false);
  }, [selectedIndex, isFullscreen]);

  // Combine media: Video (if exists) comes first
  const media = useMemo<Array<{ type: 'video' | 'image', url: string, thumbnail?: string }>>(() => {
    return videoUrl 
      ? [{ type: 'video' as const, url: videoUrl, thumbnail: videoThumbnailUrl || images[0] }, ...images.map(img => ({ type: 'image' as const, url: img }))]
      : images.map(img => ({ type: 'image' as const, url: img }));
  }, [videoUrl, videoThumbnailUrl, images]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    setSelectedIndex(index);
    
    // Pause video if we navigate away
    if (media[index]?.type !== 'video' && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [emblaApi, media]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  const toggleVideo = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getAspectRatio = (cat?: string) => {
    switch (cat) {
      case 'Coins': return 'aspect-square';
      case 'Memorabilia':
      case 'Collectibles':
      case 'General': return 'aspect-video';
      case 'Collector Cards':
      default: return 'aspect-[5/7]';
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

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (media[selectedIndex]?.type === 'video') return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      transformOrigin: `${x}% ${y}%`,
      transform: 'scale(2.0)',
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({ transformOrigin: 'center', transform: 'scale(1)' });
  };

  if (!media || media.length === 0) {
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
        {/* Main Gallery */}
        <div className={cn("relative bg-slate-950 rounded-2xl overflow-hidden group border border-slate-800 shadow-2xl", aspectRatio)}>
          
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {media.map((item, index) => (
                <div className="flex-[0_0_100%] min-w-0 relative h-full" key={index}>
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full bg-black flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={item.url}
                        className="w-full h-full object-contain"
                        playsInline
                        loop
                        muted // Auto-play usually requires mute
                        onClick={toggleVideo}
                      />
                      {!isPlaying && (
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                          onClick={toggleVideo}
                        >
                          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                            <Play className="w-10 h-10 text-white fill-white ml-1" />
                          </div>
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white rounded-full h-10 w-10 z-20"
                        onClick={toggleVideo}
                      >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="relative w-full h-full cursor-zoom-in"
                      onMouseMove={handleMouseMove}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => setIsFullscreen(true)}
                    >
                      <Image
                        src={item.url!}
                        alt={imageAltTexts[index] || `${title} - Media ${index + 1}`}
                        fill
                        className="object-contain"
                        style={index === selectedIndex ? zoomStyle : undefined}
                        priority={index === 0}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="(max-width: 768px) 100vw, 800px"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {media.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-xl border-white/10 text-white hover:bg-black/60 rounded-full h-12 w-12 z-20 hidden sm:flex"
                onClick={scrollPrev}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={3} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-xl border-white/10 text-white hover:bg-black/60 rounded-full h-12 w-12 z-20 hidden sm:flex"
                onClick={scrollNext}
              >
                <ChevronRight className="w-6 h-6" strokeWidth={3} />
              </Button>
            </>
          )}

          {/* Premium Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-20">
            {condition && (
              <Badge className={cn("border-none shadow-lg backdrop-blur-md py-1 px-3 text-xs font-bold uppercase tracking-wider", conditionColors[condition] || 'bg-white/90 text-slate-900')}>
                {condition}
              </Badge>
            )}
            {isAuthenticated && (
              <Badge className="bg-blue-600/90 text-white border-none shadow-lg backdrop-blur-md py-1 px-3 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Auth Verified
              </Badge>
            )}
          </div>

          {/* Image Counter (Premium Monospace Style) */}
          <div className="absolute bottom-4 right-4 z-20">
             <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 text-[11px] font-mono font-bold text-white tracking-widest shadow-2xl">
               {String(selectedIndex + 1).padStart(2, '0')} : {String(media.length).padStart(2, '0')}
             </div>
          </div>

          {/* Show All Photos Button */}
          <Button
            onClick={() => setIsFullscreen(true)}
            variant="ghost"
            className="absolute top-4 right-4 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border border-white/10 rounded-full px-4 h-9 text-xs font-bold uppercase tracking-tighter z-20 transition-all active:scale-95"
          >
            <ImageIcon className="w-3.5 h-3.5 mr-2" />
            Show All Photos
          </Button>

        </div>

        {/* Thumbnail Strip */}
        {media.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {media.map((item, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 transition-all duration-300",
                  index === selectedIndex ? 'border-primary scale-105 ring-4 ring-primary/10 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-slate-900">
                    <Image src={item.thumbnail!} alt="Video thumb" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                       <Play className="w-6 h-6 text-white fill-white" />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={item.url!}
                    alt={imageAltTexts[index] || `Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    sizes="80px"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Viewer */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 bg-black/95 backdrop-blur-2xl border-none shadow-none flex flex-col focus:outline-none z-[100]">
          <DialogTitle className="sr-only">Full-screen view of {title}</DialogTitle>
          <DialogDescription className="sr-only">Viewing media {selectedIndex + 1} of {media.length}.</DialogDescription>

          <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-auto">
            <div 
              className={cn(
                "relative transition-all duration-300", 
                media[selectedIndex]?.type !== 'video' && (isFullZoom ? "w-[200vw] h-[200vh] cursor-zoom-out" : "w-full h-full cursor-zoom-in")
              )}
              onClick={() => media[selectedIndex]?.type !== 'video' && setIsFullZoom(!isFullZoom)}
            >
              {media[selectedIndex]?.type === 'video' ? (
                <video
                  src={media[selectedIndex].url}
                  className="w-full h-full object-contain"
                  controls
                  autoPlay
                />
              ) : (
                <Image
                  src={media[selectedIndex].url!}
                  alt={imageAltTexts[selectedIndex] || `${title} - Fullscreen`}
                  fill
                  sizes={isFullZoom ? "200vw" : "100vw"}
                  className="object-contain"
                  priority
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="absolute top-6 right-6 text-white/60 hover:bg-white/10 hover:text-white rounded-full h-12 w-12 z-[110] backdrop-blur-md"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-8 h-8" />
            </Button>

            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white hover:bg-white/5 h-20 w-20 rounded-full z-[105] transition-all"
                  onClick={() => setSelectedIndex(prev => (prev === 0 ? media.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="w-12 h-12" strokeWidth={3} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white hover:bg-white/5 h-20 w-20 rounded-full z-[105] transition-all"
                  onClick={() => setSelectedIndex(prev => (prev === media.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight className="w-12 h-12" strokeWidth={3} />
                </Button>
              </>
            )}

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/10 backdrop-blur-2xl rounded-full text-white text-sm font-mono font-bold tracking-widest border border-white/20">
              {String(selectedIndex + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
