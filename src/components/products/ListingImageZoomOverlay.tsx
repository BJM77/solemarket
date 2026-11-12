
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
  ZOOM_LEAVE_LENIENCY_PX,
  ZOOM_LENS_SCALE,
  ZOOM_LENS_SIZE_PX,
  isOutsideImageWithLeniency,
  lensBackgroundPosition,
} from '@/lib/listing-zoom/geometry';

type Props = {
  open: boolean;
  src: string;
  alt: string;
  onClose: () => void;
};

export default function ListingImageZoomOverlay({ open, src, alt, onClose }: Props) {
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const hasEnteredImage = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number; bgX: number; bgY: number; imgW: number; imgH: number; visible: boolean }>({
    x: 0,
    y: 0,
    bgX: 50,
    bgY: 50,
    imgW: 0,
    imgH: 0,
    visible: false,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    hasEnteredImage.current = false;
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);

    const updateLens = (clientX: number, clientY: number) => {
      const rect = imageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const outside = isOutsideImageWithLeniency(clientX, clientY, rect, ZOOM_LEAVE_LENIENCY_PX);
      if (outside) {
        // Do not auto-close until the pointer has actually entered the enlarged image,
        // otherwise opening from the listing photo would immediately dismiss the overlay.
        if (hasEnteredImage.current) onClose();
        return;
      }
      hasEnteredImage.current = true;
      const pos = lensBackgroundPosition(clientX, clientY, rect);
      setLens({
        x: clientX - rect.left,
        y: clientY - rect.top,
        bgX: pos.x,
        bgY: pos.y,
        imgW: rect.width,
        imgH: rect.height,
        visible: true,
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      updateLens(event.clientX, event.clientY);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointermove', onPointerMove);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const half = ZOOM_LENS_SIZE_PX / 2;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed listing photo"
      data-testid="listing-zoom-overlay"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-6"
    >
      <button
        ref={closeRef}
        type="button"
        aria-label="Close zoom"
        data-testid="listing-zoom-close"
        className="absolute right-4 top-[calc(env(safe-area-inset-top,0px)+1rem)] z-[210] flex h-11 w-11 items-center justify-center rounded-full bg-black/70 text-white ring-1 ring-white/40 shadow-xl backdrop-blur-md hover:bg-black/85"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
      >
        <X className="h-6 w-6" strokeWidth={2.5} />
      </button>

      <div className="relative inline-block max-h-[92vh] max-w-[92vw]">
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className="block max-h-[92vh] max-w-[92vw] select-none object-contain"
          style={{ cursor: 'none' }}
          draggable={false}
        />
        {lens.visible && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute rounded-full border-2 border-white/80 bg-no-repeat shadow-[0_0_25px_rgba(0,0,0,0.6)] ring-4 ring-black/20"
            style={{
              width: ZOOM_LENS_SIZE_PX,
              height: ZOOM_LENS_SIZE_PX,
              left: lens.x - half,
              top: lens.y - half,
              backgroundImage: `url(${src})`,
              backgroundPosition: `${lens.bgX}% ${lens.bgY}%`,
              backgroundSize: `${lens.imgW * ZOOM_LENS_SCALE}px ${lens.imgH * ZOOM_LENS_SCALE}px`,
            }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
