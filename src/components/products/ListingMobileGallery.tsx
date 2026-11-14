'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  IDENTITY,
  type Point,
  type Transform,
  classifySwipe,
  clampPan,
  counterLabel,
  distance,
  doubleTapTransform,
  isDoubleTap,
  isTap,
  isZoomed,
  layoutOrigin,
  midpoint,
  panTransform,
  pinchTransform,
  untransformedSize,
  wrapIndex,
} from '@/lib/listing-gallery/gestures';

type Props = {
  open: boolean;
  images: string[];
  initialIndex: number;
  title: string;
  altTexts?: string[];
  onClose: () => void;
};

type Gesture = 'none' | 'pinch' | 'pan' | 'swipe';

export default function ListingMobileGallery({
  open,
  images,
  initialIndex,
  title,
  altTexts = [],
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const pushedHistory = useRef(false);
  const closingFromHistory = useRef(false);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture>('none');
  const transformRef = useRef<Transform>({ ...IDENTITY });
  const pinchStart = useRef<(Transform & { midpoint: Point; distance: number; origin: Point }) | null>(null);
  const panStart = useRef<{ transform: Transform; from: Point } | null>(null);
  const swipeStart = useRef<Point | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);
  const onCloseRef = useRef(onClose);

  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [transform, setTransform] = useState<Transform>({ ...IDENTITY });
  const [swipe, setSwipe] = useState<Point>({ x: 0, y: 0 });

  onCloseRef.current = onClose;

  const applyTransform = useCallback((next: Transform) => {
    const image = imageRef.current;
    const viewport = surfaceRef.current;
    if (!image || !viewport) {
      transformRef.current = next;
      setTransform(next);
      return;
    }
    const imageRect = image.getBoundingClientRect();
    const viewRect = viewport.getBoundingClientRect();
    const size = untransformedSize(imageRect, transformRef.current.scale);
    const clamped = clampPan(next, { width: viewRect.width, height: viewRect.height }, size);
    transformRef.current = clamped;
    setTransform(clamped);
  }, []);

  const resetView = useCallback(() => {
    transformRef.current = { ...IDENTITY };
    setTransform({ ...IDENTITY });
    setSwipe({ x: 0, y: 0 });
    gesture.current = 'none';
    pointers.current.clear();
    pinchStart.current = null;
    panStart.current = null;
    swipeStart.current = null;
  }, []);

  const step = useCallback((delta: number) => {
    if (images.length <= 0) return;
    setIndex((current) => wrapIndex(current, images.length, delta));
    resetView();
  }, [images.length, resetView]);

  const close = useCallback(() => {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      closingFromHistory.current = false;
      window.history.back();
      return;
    }
    onCloseRef.current();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setIndex(Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1))));
    resetView();
  }, [open, initialIndex, images.length, resetView]);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const previous = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    };
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';

    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    if (!pushedHistory.current) {
      window.history.pushState({ listingMobileGallery: true }, '');
      pushedHistory.current = true;
    }

    const onPopState = () => {
      pushedHistory.current = false;
      closingFromHistory.current = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPopState);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('popstate', onPopState);
      document.body.style.overflow = previous.overflow;
      document.body.style.position = previous.position;
      document.body.style.top = previous.top;
      document.body.style.width = previous.width;
      window.scrollTo(0, scrollY);
      previousFocus.current?.focus?.();
      if (pushedHistory.current && !closingFromHistory.current) {
        pushedHistory.current = false;
        window.history.back();
      }
      closingFromHistory.current = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        step(-1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        step(1);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close, step]);

  useEffect(() => {
    if (!open) return;
    const surface = surfaceRef.current;
    if (!surface) return;

    const originFromImage = (): Point => {
      const image = imageRef.current;
      if (!image) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      return layoutOrigin(image.getBoundingClientRect(), transformRef.current);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 && event.pointerType === 'mouse') return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-gallery-chrome]')) return;

      surface.setPointerCapture(event.pointerId);
      const point = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, point);

      if (pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        gesture.current = 'pinch';
        const mid = midpoint(a, b);
        pinchStart.current = {
          ...transformRef.current,
          midpoint: mid,
          distance: Math.max(distance(a, b), 1),
          origin: originFromImage(),
        };
        setSwipe({ x: 0, y: 0 });
        return;
      }

      if (isZoomed(transformRef.current.scale)) {
        gesture.current = 'pan';
        panStart.current = { transform: transformRef.current, from: point };
      } else {
        gesture.current = 'swipe';
        swipeStart.current = point;
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      event.preventDefault();
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (gesture.current === 'pinch' && pinchStart.current && pointers.current.size >= 2) {
        const [a, b] = [...pointers.current.values()];
        const next = pinchTransform(
          pinchStart.current,
          midpoint(a, b),
          distance(a, b) / pinchStart.current.distance,
          pinchStart.current.origin,
        );
        applyTransform(next);
        return;
      }

      if (gesture.current === 'pan' && panStart.current) {
        applyTransform(panTransform(panStart.current.transform, panStart.current.from, { x: event.clientX, y: event.clientY }));
        return;
      }

      if (gesture.current === 'swipe' && swipeStart.current) {
        setSwipe({
          x: event.clientX - swipeStart.current.x,
          y: event.clientY - swipeStart.current.y,
        });
      }
    };

    const endPointer = (event: PointerEvent) => {
      if (!pointers.current.has(event.pointerId)) return;
      const point = { x: event.clientX, y: event.clientY };
      pointers.current.delete(event.pointerId);

      if (gesture.current === 'pinch') {
        if (pointers.current.size < 2) {
          if (!isZoomed(transformRef.current.scale)) applyTransform({ ...IDENTITY });
          gesture.current = pointers.current.size === 1 && isZoomed(transformRef.current.scale) ? 'pan' : 'none';
          if (gesture.current === 'pan') {
            const remaining = [...pointers.current.values()][0];
            panStart.current = { transform: transformRef.current, from: remaining };
          }
          pinchStart.current = null;
        }
        return;
      }

      if (gesture.current === 'pan') {
        if (pointers.current.size === 0) {
          if (!isZoomed(transformRef.current.scale)) applyTransform({ ...IDENTITY });
          gesture.current = 'none';
          panStart.current = null;
        }
        return;
      }

      if (gesture.current !== 'swipe' || !swipeStart.current) {
        if (pointers.current.size === 0) gesture.current = 'none';
        return;
      }

      const start = swipeStart.current;
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      swipeStart.current = null;
      gesture.current = 'none';

      if (isTap(start, point)) {
        setSwipe({ x: 0, y: 0 });
        const tap = { time: performance.now(), point };
        if (isDoubleTap(lastTap.current, tap)) {
          lastTap.current = null;
          const next = doubleTapTransform(transformRef.current, point, originFromImage());
          applyTransform(next);
        } else {
          lastTap.current = tap;
        }
        return;
      }

      const direction = classifySwipe(dx, dy);
      setSwipe({ x: 0, y: 0 });
      if (direction === 'down') {
        close();
        return;
      }
      if (direction === 'left') {
        step(1);
        return;
      }
      if (direction === 'right') {
        step(-1);
      }
    };

    // Non-passive so preventDefault can stop the browser from scrolling or page-zooming.
    const options: AddEventListenerOptions = { passive: false };
    surface.addEventListener('pointerdown', onPointerDown);
    surface.addEventListener('pointermove', onPointerMove, options);
    surface.addEventListener('pointerup', endPointer);
    surface.addEventListener('pointercancel', endPointer);
    surface.addEventListener('lostpointercapture', endPointer);

    return () => {
      surface.removeEventListener('pointerdown', onPointerDown);
      surface.removeEventListener('pointermove', onPointerMove, options);
      surface.removeEventListener('pointerup', endPointer);
      surface.removeEventListener('pointercancel', endPointer);
      surface.removeEventListener('lostpointercapture', endPointer);
    };
  }, [open, applyTransform, close, step]);

  if (!mounted || !open || images.length === 0) return null;

  const src = images[Math.max(0, Math.min(index, images.length - 1))]!;
  const alt = altTexts[index] || `${title} - Photo ${index + 1}`;
  const swipeFade = swipe.y > 0 && !isZoomed(transform.scale)
    ? Math.max(0.4, 1 - swipe.y / 400)
    : 1;
  const imageTranslate = isZoomed(transform.scale)
    ? { x: transform.x, y: transform.y }
    : { x: transform.x + swipe.x, y: transform.y + swipe.y };

  return createPortal(
    <div
      ref={surfaceRef}
      role="dialog"
      aria-modal="true"
      aria-label="Listing photos"
      data-testid="listing-mobile-gallery"
      className="fixed inset-0 z-[200] touch-none overscroll-none bg-black"
      style={{ backgroundColor: `rgba(0,0,0,${swipeFade})` }}
    >
      <button
        ref={closeRef}
        type="button"
        data-gallery-chrome
        aria-label="Close photos"
        data-testid="listing-mobile-gallery-close"
        className="absolute right-4 z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/40 shadow-xl backdrop-blur-md top-[calc(env(safe-area-inset-top,0px)+1rem)]"
        onClick={(event) => {
          event.stopPropagation();
          close();
        }}
      >
        <X className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <div
        data-testid="listing-mobile-gallery-counter"
        data-gallery-chrome
        className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] left-1/2 z-[210] -translate-x-1/2 rounded-full bg-black/60 px-3 py-1.5 text-sm font-medium text-white"
      >
        {counterLabel(index, images.length)}
      </div>

      <div className="flex h-full w-full items-center justify-center">
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full select-none object-contain"
          style={{
            transform: `translate(${imageTranslate.x}px, ${imageTranslate.y}px) scale(${transform.scale})`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
      </div>
    </div>,
    document.body,
  );
}
