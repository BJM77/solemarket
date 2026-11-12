
"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type React from 'react';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, X, Image as ImageIcon, ShieldCheck, Play, Pause, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils/ui";
import { GALLERY_SIZES } from '@/lib/listing-nav';
import { isCardCategory, isCoinCategory } from '@/lib/constants/marketplace';
import ListingImageZoomOverlay from './ListingImageZoomOverlay';
import { ZOOM_HOVER_DELAY_MS, isInTopHoverZone } from '@/lib/listing-zoom/geometry';

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
  /** Desktop only: show the thumbnails in a vertical column beside the main photo instead of below it. */
  thumbnailsSide?: boolean;
  /** Phones only: listing title shown at the start of the row above the photo. */
  mobileTitle?: React.ReactNode;
}

const conditionColors: Record<string, string> = {
  'Mint': 'bg-green-100 text-green-800 border-green-200',
  'Near Mint': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Excellent': 'bg-orange-100 text-orange-800 border-orange-200',
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
  imageAltTexts = [],
  thumbnailsSide = false,
  mobileTitle
}: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    skipSnaps: false,
    // On touch screens, dragging is reserved for the magnifier; photos change via the arrow buttons.
    watchDrag: (_api, evt) => !(evt.type.startsWith('touch') || (evt as PointerEvent).pointerType === 'touch'),
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isZoomOverlayOpen, setIsZoomOverlayOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullZoom, setIsFullZoom] = useState(false);
  const [canHoverZoom, setCanHoverZoom] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hoverZoomTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverZoomTimer = useCallback(() => {
    if (hoverZoomTimer.current) {
      clearTimeout(hoverZoomTimer.current);
      hoverZoomTimer.current = null;
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const update = () => setCanHoverZoom(mediaQuery.matches);
    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  // Reset zoom when the slide or lightbox changes
  useEffect(() => {
    setIsFullZoom(false);
    clearHoverZoomTimer();
    setIsZoomOverlayOpen(false);
  }, [selectedIndex, isFullscreen, clearHoverZoomTimer]);

  useEffect(() => () => clearHoverZoomTimer(), [clearHoverZoomTimer]);

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
    if (isCoinCategory(cat)) return 'aspect-square';
    if (isCardCategory(cat)) return 'aspect-[5/7]';
    return 'aspect-square';
  };

  const aspectRatio = getAspectRatio(category);
  // Cap gallery height so phones keep room to scroll: width is limited so the aspect box never exceeds ~50% of the viewport height.
  // With side thumbnails the desktop photo may use the whole viewport below the site header.
  // Phones/tablets keep a height cap so the photo does not dominate the page.
  // On the desktop 50/50 listing layout, drop the max-width so the image fills its column.
  const heightCap = aspectRatio === 'aspect-[5/7]'
    ? cn('md:max-w-[calc(50svh*5/7)]', thumbnailsSide ? 'lg:max-w-none' : 'lg:max-w-[calc(68vh*5/7)]')
    : cn('md:max-w-[50svh]', thumbnailsSide ? 'lg:max-w-none' : 'lg:max-w-[68vh]');

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

  const openZoomOverlay = useCallback(() => {
    if (media[selectedIndex]?.type === 'video') return;
    clearHoverZoomTimer();
    setIsZoomOverlayOpen(true);
  }, [media, selectedIndex, clearHoverZoomTimer]);

  const closeZoomOverlay = useCallback(() => {
    setIsZoomOverlayOpen(false);
  }, []);

  const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canHoverZoom || e.pointerType !== 'mouse' || isZoomOverlayOpen) return;
    if (media[selectedIndex]?.type === 'video') return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (isInTopHoverZone(e.clientX, e.clientY, rect)) {
      if (!hoverZoomTimer.current) {
        hoverZoomTimer.current = setTimeout(() => openZoomOverlay(), ZOOM_HOVER_DELAY_MS);
      }
    } else {
      clearHoverZoomTimer();
    }
  };

  const handleImagePointerLeave = () => {
    clearHoverZoomTimer();
  };

  const handleImageClick = () => {
    if (!canHoverZoom) return;
    openZoomOverlay();
  };

  const handleImageKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canHoverZoom) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      openZoomOverlay();
    }
  };

  if (!media || media.length === 0) {
    return (
      <div className={cn("relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center text-muted-foreground", aspectRatio)}>
        <div className="flex flex-col items-center">
          <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
          <span className="text-xs font-medium">No Image Available</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn("space-y-4 max-md:space-y-0", thumbnailsSide && "lg:space-y-0 lg:flex lg:flex-row lg:items-start lg:gap-4")}>
        {/* Phones: condition badge + icon-sized thumbnails on one row above the photo */}
        {(mobileTitle || condition || media.length > 1) && (
          <div className="md:hidden flex items-center gap-1.5 mb-2" data-testid="mobile-thumb-row">
            {mobileTitle && <div className="flex-1 min-w-0">{mobileTitle}</div>}
            <div className="flex items-center gap-1.5 shrink-0 max-w-[60%] overflow-x-auto scrollbar-hide p-0.5">
            {condition && (
              <Badge className={cn("shrink-0 border-none py-1 px-2.5 text-[11px] font-bold uppercase tracking-wider", conditionColors[condition] || 'bg-slate-100 text-slate-900')}>
                {condition}
              </Badge>
            )}
            {media.length > 1 && media.map((item, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === selectedIndex ? 'true' : undefined}
                className={cn(
                  "relative shrink-0 w-[34px] h-[34px] rounded-md overflow-hidden border border-border transition-all",
                  index === selectedIndex ? "ring-2 ring-orange-500 ring-offset-1 ring-offset-background" : "opacity-70"
                )}
              >
                <Image src={(item.type === 'video' ? item.thumbnail : item.url)!} alt="" fill className="object-cover" sizes="36px" />
                {item.type === 'video' && <Play className="absolute inset-0 m-auto w-3 h-3 text-white fill-white" />}
              </button>
            ))}
            </div>
          </div>
        )}

        {/* Main Gallery — desktop listing fills the 50% column; mobile height caps stay in place. */}
        <div className={cn("relative w-full mx-auto bg-background rounded-2xl overflow-hidden group border border-border shadow-2xl", thumbnailsSide && "lg:mx-0 lg:flex-1 lg:min-w-0", aspectRatio, heightCap)}>
          
          <div className="overflow-hidden h-full" ref={emblaRef}>
            <div className="flex h-full">
              {media.map((item, index) => (
                <div className="flex-[0_0_100%] min-w-0 relative h-full" key={index}>
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full bg-background flex items-center justify-center">
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
                          <div className="w-20 h-20 rounded-full bg-muted backdrop-blur-md border border-border flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                            <Play className="w-10 h-10 text-foreground fill-white ml-1" />
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
                    <div className="relative w-full h-full px-6 py-4 sm:p-0">
                    <div
                      role={canHoverZoom ? 'button' : undefined}
                      tabIndex={canHoverZoom ? 0 : undefined}
                      aria-label={canHoverZoom ? `View enlarged photo of ${title}` : undefined}
                      className={cn("relative w-full h-full", canHoverZoom && "md:cursor-zoom-in")}
                      onPointerMove={handleImagePointerMove}
                      onPointerLeave={handleImagePointerLeave}
                      onClick={handleImageClick}
                      onKeyDown={handleImageKeyDown}
                    >
                      <Image
                        src={item.url!}
                        alt={imageAltTexts[index] || `${title} - Media ${index + 1}`}
                        fill
                        className="object-contain"
                        priority={index === 0}
                        fetchPriority={index === 0 ? "high" : "auto"}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes={GALLERY_SIZES}
                      />
                      {canHoverZoom && (
                        <div className="hidden md:flex absolute inset-x-0 top-0 h-[20%] items-start justify-center pt-3 pointer-events-none z-10">
                          <div className="flex items-center gap-1.5 rounded-full bg-black/45 text-white text-[11px] font-semibold px-2.5 py-1 backdrop-blur-sm shadow-sm">
                            <ZoomIn className="h-3.5 w-3.5" />
                            Hold to zoom
                          </div>
                        </div>
                      )}
                    </div>
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
                className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-xl border-border text-white hover:bg-black/60 rounded-full h-12 w-12 z-20 hidden sm:flex"
                onClick={scrollPrev}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={3} />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all bg-black/40 backdrop-blur-xl border-border text-white hover:bg-black/60 rounded-full h-12 w-12 z-20 hidden sm:flex"
                onClick={scrollNext}
              >
                <ChevronRight className="w-6 h-6" strokeWidth={3} />
              </Button>
            </>
          )}

          {/* Mobile arrows: sit in the side inset so they never cover the magnifier area */}
          {media.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                className="sm:hidden absolute left-0.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-5 items-center justify-center rounded-full bg-background/90 border border-border text-foreground shadow-sm active:scale-95"
                onClick={scrollPrev}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                className="sm:hidden absolute right-0.5 top-1/2 -translate-y-1/2 z-20 flex h-8 w-5 items-center justify-center rounded-full bg-background/90 border border-border text-foreground shadow-sm active:scale-95"
                onClick={scrollNext}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
              </button>
            </>
          )}

          {/* Premium Overlays */}
          <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none z-20">
            {condition && (
              <Badge className={cn("max-md:hidden border-none shadow-lg backdrop-blur-md py-1 px-3 text-xs font-bold uppercase tracking-wider", conditionColors[condition] || 'bg-white/90 text-slate-900')}>
                {condition}
              </Badge>
            )}
            {isAuthenticated && (
              <Badge className="bg-primary/90 text-primary-foreground border-none shadow-lg backdrop-blur-md py-1 px-3 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Auth Verified
              </Badge>
            )}
          </div>

          {/* Image Counter (Premium Monospace Style) */}
          <div className="absolute bottom-4 right-4 z-20">
             <div className="bg-black/60 backdrop-blur-xl border border-border rounded-full px-3 py-1.5 text-[11px] font-mono font-bold text-white tracking-widest shadow-2xl">
               {String(selectedIndex + 1).padStart(2, '0')} : {String(media.length).padStart(2, '0')}
             </div>
          </div>

          {/* Show All Photos Button */}
          <Button
            onClick={() => setIsFullscreen(true)}
            variant="ghost"
            aria-label="Show all photos"
            className="absolute top-4 right-4 bg-black/40 backdrop-blur-md hover:bg-black/60 text-white border border-border rounded-full px-2.5 sm:px-4 h-9 text-xs font-bold uppercase tracking-tighter z-20 transition-all active:scale-95"
          >
            <ImageIcon className="w-3.5 h-3.5 sm:mr-2" />
            <span className="hidden sm:inline">Show All Photos</span>
          </Button>

        </div>

        {/* Thumbnail Strip */}
        {media.length > 1 && (
          <div className={cn(
            "max-md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide",
            thumbnailsSide && "lg:order-first lg:flex-col lg:shrink-0 lg:overflow-x-hidden lg:overflow-y-auto lg:p-1 lg:pb-1 lg:max-h-[calc(100vh-9rem)]"
          )}>
            {media.map((item, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={cn(
                  "relative flex-shrink-0 w-12 h-12 md:w-20 md:h-20 rounded-lg md:rounded-2xl overflow-hidden border-2 transition-all duration-300",
                  index === selectedIndex ? 'border-primary scale-105 ring-4 ring-primary/10 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'
                )}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-card">
                    <Image src={item.thumbnail!} alt="Video thumb" fill className="object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                       <Play className="w-6 h-6 text-foreground fill-white" />
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

      {canHoverZoom && media[selectedIndex]?.type === 'image' && media[selectedIndex].url && (
        <ListingImageZoomOverlay
          open={isZoomOverlayOpen}
          src={media[selectedIndex].url}
          alt={imageAltTexts[selectedIndex] || `${title} - Zoomed`}
          onClose={closeZoomOverlay}
        />
      )}

      {/* Fullscreen Viewer */}
      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="max-w-[100vw] w-full h-[100vh] p-0 bg-black/95 backdrop-blur-2xl border-none shadow-none flex flex-col focus:outline-none z-[100] [&>button:last-child]:hidden">
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

            <button
              type="button"
              aria-label="Close photo viewer"
              data-testid="lightbox-close"
              className="fixed right-4 z-[130] flex h-12 w-12 min-h-11 min-w-11 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/40 shadow-xl backdrop-blur-md active:scale-95 top-[calc(env(safe-area-inset-top,0px)+1.25rem)] md:top-6 md:right-6"
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(false); }}
            >
              <X className="h-7 w-7" strokeWidth={2.75} />
            </button>

            {media.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-foreground hover:bg-muted/60 h-20 w-20 rounded-full z-[105] transition-all"
                  onClick={() => setSelectedIndex(prev => (prev === 0 ? media.length - 1 : prev - 1))}
                >
                  <ChevronLeft className="w-12 h-12" strokeWidth={3} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-foreground hover:bg-muted/60 h-20 w-20 rounded-full z-[105] transition-all"
                  onClick={() => setSelectedIndex(prev => (prev === media.length - 1 ? 0 : prev + 1))}
                >
                  <ChevronRight className="w-12 h-12" strokeWidth={3} />
                </Button>
              </>
            )}

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-muted backdrop-blur-2xl rounded-full text-foreground text-sm font-mono font-bold tracking-widest border border-border">
              {String(selectedIndex + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
