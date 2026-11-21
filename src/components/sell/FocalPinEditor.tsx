'use client';

import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils/ui';
import {
  clientPointToFocal,
  containedImageRect,
  describeFocalPoint,
  focalCssPosition,
  normalizeFocalPoint,
  nudgeFocalPoint,
  type ImageFocalPoint,
} from '@/lib/images/focal-point';

type Props = {
  src: string;
  /** The saved pin (null = never set, shown at the centre). */
  value: ImageFocalPoint | null;
  /** Called once per gesture, when the finger or mouse lifts (and per arrow key press). */
  onChange: (point: ImageFocalPoint) => void;
  label?: string;
  className?: string;
};

/**
 * Big photo preview with a draggable centre pin, plus live tile previews.
 * - Drag anywhere on the photo; the pin follows locally and saves when the finger lifts.
 * - Keyboard: focus the pin (role="slider"), arrows move it 1% (Shift: 10%).
 * - The tiles below show how the cropped grid tile will look (phone 3:4, desktop square).
 */
export function FocalPinEditor({ src, value, onChange, label = "Item's centre", className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const gesture = useRef<number | null>(null);
  const [draft, setDraft] = useState<ImageFocalPoint | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });
  const focal = draft ?? normalizeFocalPoint(value);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBoxSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [src]);

  const pointFromClient = (clientX: number, clientY: number): ImageFocalPoint | null => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return null;
    const img = imgRef.current;
    return clientPointToFocal(clientX, clientY, box, img?.naturalWidth || natural.w, img?.naturalHeight || natural.h);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    gesture.current = e.pointerId;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraft(pointFromClient(e.clientX, e.clientY));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (gesture.current !== e.pointerId) return;
    setDraft(pointFromClient(e.clientX, e.clientY));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (gesture.current !== e.pointerId) return;
    gesture.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    const p = pointFromClient(e.clientX, e.clientY) ?? draft;
    setDraft(null);
    if (p) onChange(p);
  };

  const onPointerCancel = () => {
    gesture.current = null;
    setDraft(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next = nudgeFocalPoint(focal, e.key, e.shiftKey);
    if (!next) return;
    e.preventDefault();
    onChange(next);
  };

  const imgRect = containedImageRect(boxSize.w, boxSize.h, natural.w, natural.h);
  const position = focalCssPosition(focal);

  return (
    <div className={cn('space-y-3', className)}>
      <div
        ref={boxRef}
        data-testid="focal-pin-editor"
        // Inside the editor the photo owns the gesture (dragging moves the pin, not the page).
        className="relative h-[42svh] max-h-[460px] min-h-[220px] w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg bg-muted"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-roledescription="position"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(focal.x * 100)}
          aria-valuetext={describeFocalPoint(focal)}
          aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown"
          onKeyDown={onKeyDown}
          data-testid="focal-pin"
          className="absolute z-[1] h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-primary shadow-lg outline-none ring-1 ring-black/40 focus-visible:ring-4 focus-visible:ring-primary/60"
          style={{ left: imgRect.left + focal.x * imgRect.width, top: imgRect.top + focal.y * imgRect.height }}
        />
      </div>
      <div className="flex items-end gap-3" aria-hidden>
        <figure className="space-y-1">
          <div className="relative aspect-[3/4] w-16 overflow-hidden rounded-md border border-border bg-white">
            <img src={src} alt="" data-testid="tile-preview-phone" className="h-full w-full object-cover" style={{ objectPosition: position }} />
          </div>
          <figcaption className="text-center text-[10px] text-muted-foreground">Phone</figcaption>
        </figure>
        <figure className="space-y-1">
          <div className="relative aspect-square w-20 overflow-hidden rounded-md border border-border bg-white">
            <img src={src} alt="" data-testid="tile-preview-desktop" className="h-full w-full object-cover" style={{ objectPosition: position }} />
          </div>
          <figcaption className="text-center text-[10px] text-muted-foreground">Desktop</figcaption>
        </figure>
        <p className="flex-1 pb-5 text-xs text-muted-foreground">How the listing tile will look in the grid.</p>
      </div>
    </div>
  );
}
