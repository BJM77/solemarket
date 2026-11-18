'use client';

import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { cn } from '@/lib/utils/ui';
import {
  clientPointToFocal,
  containedImageRect,
  normalizeFocalPoint,
  type ImageFocalPoint,
} from '@/lib/images/focal-point';

type Props = {
  src: string;
  value?: ImageFocalPoint | null;
  onChange: (point: ImageFocalPoint) => void;
  alt?: string;
  className?: string;
  /** Visible label announced to assistive tech. */
  label?: string;
};

/** A touch that moves further than this is a scroll, not a tap. */
const TAP_SLOP_PX = 10;

/**
 * Square (or filled) preview of a listing photo with a centre pin.
 * - Mouse/pen: click or drag; the pin follows locally and is committed on release,
 *   so the parent form doesn't re-render on every pointer move.
 * - Touch: tap to place. Dragging scrolls the page as usual (no touch-none).
 * - Keyboard / screen readers: two labelled range inputs (left–right, top–bottom).
 */
export function ImageFocalPicker({
  src,
  value,
  onChange,
  alt = '',
  className,
  label = "Item's centre",
}: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const gesture = useRef<{ id: number; touch: boolean; x: number; y: number; moved: boolean } | null>(null);
  const [draft, setDraft] = useState<ImageFocalPoint | null>(null);
  const focal = draft ?? normalizeFocalPoint(value);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });

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
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const touch = e.pointerType === 'touch';
    gesture.current = { id: e.pointerId, touch, x: e.clientX, y: e.clientY, moved: false };
    if (touch) return; // wait for the tap to finish; a drag here is a page scroll
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDraft(pointFromClient(e.clientX, e.clientY));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP_SLOP_PX) g.moved = true;
    if (!g.touch) setDraft(pointFromClient(e.clientX, e.clientY));
  };

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDraft(null);
    if (g.touch && g.moved) return;
    const p = pointFromClient(e.clientX, e.clientY);
    if (p) onChange(p);
  };

  const onPointerCancel = () => {
    // The browser took over (e.g. a scroll): drop the gesture without changing the pin.
    gesture.current = null;
    setDraft(null);
  };

  const setAxis = (axis: 'x' | 'y', percent: number) => {
    const v = Math.min(1, Math.max(0, percent / 100));
    onChange(axis === 'x' ? { x: v, y: focal.y } : { x: focal.x, y: v });
  };

  const imgRect = containedImageRect(boxSize.w, boxSize.h, natural.w, natural.h);
  const pinLeft = imgRect.left + focal.x * imgRect.width;
  const pinTop = imgRect.top + focal.y * imgRect.height;

  return (
    <div
      ref={boxRef}
      role="group"
      aria-label={label}
      data-testid="image-focal-picker"
      className={cn(
        'relative h-full w-full touch-manipulation cursor-crosshair overflow-hidden bg-muted outline-none focus-within:ring-2 focus-within:ring-orange-500',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* Native img so we can read naturalWidth for letterbox mapping; object-contain keeps the whole photo visible while pinning. */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute z-[1] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-orange-500 shadow-md ring-1 ring-black/40"
        style={{ left: pinLeft, top: pinTop }}
      />
      <label className="sr-only">
        {label}: left to right
        <input type="range" min={0} max={100} step={1} value={Math.round(focal.x * 100)} onChange={(e) => setAxis('x', Number(e.target.value))} />
      </label>
      <label className="sr-only">
        {label}: top to bottom
        <input type="range" min={0} max={100} step={1} value={Math.round(focal.y * 100)} onChange={(e) => setAxis('y', Number(e.target.value))} />
      </label>
    </div>
  );
}

export const FOCAL_HINT = "Tap the item's centre";
