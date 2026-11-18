'use client';

import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/utils/ui';
import {
  DEFAULT_FOCAL_POINT,
  clientPointToFocal,
  containedImageRect,
  normalizeFocalPoint,
  type ImageFocalPoint,
} from '@/lib/images/focal-point';

type Props = {
  src: string;
  value?: ImageFocalPoint;
  onChange: (point: ImageFocalPoint) => void;
  alt?: string;
  className?: string;
  /** Visible label announced to assistive tech. */
  label?: string;
};

const NUDGE = 0.02;
const NUDGE_FAST = 0.06;

/**
 * Square (or filled) preview of a listing photo with a draggable centre pin.
 * Clicks/taps/drags and arrow keys set a normalised 0–1 point on the photo
 * itself (letterboxed clicks clamp to the nearest edge).
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
  const dragging = useRef(false);
  const focal = normalizeFocalPoint(value);
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

  const readNatural = () => {
    const img = imgRef.current;
    const w = img?.naturalWidth || natural.w;
    const h = img?.naturalHeight || natural.h;
    return { w, h };
  };

  const setFromClient = useCallback((clientX: number, clientY: number) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || box.width <= 0 || box.height <= 0) return;
    const { w, h } = readNatural();
    onChange(clientPointToFocal(clientX, clientY, box, w, h));
    // readNatural closes over natural; that's fine — naturalWidth is preferred.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, natural.w, natural.h]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    setFromClient(e.clientX, e.clientY);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    setFromClient(e.clientX, e.clientY);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? NUDGE_FAST : NUDGE;
    let next: ImageFocalPoint | null = null;
    if (e.key === 'ArrowLeft') next = { x: focal.x - step, y: focal.y };
    else if (e.key === 'ArrowRight') next = { x: focal.x + step, y: focal.y };
    else if (e.key === 'ArrowUp') next = { x: focal.x, y: focal.y - step };
    else if (e.key === 'ArrowDown') next = { x: focal.x, y: focal.y + step };
    else if (e.key === 'Home') next = { ...DEFAULT_FOCAL_POINT };
    if (!next) return;
    e.preventDefault();
    onChange({ x: Math.min(1, Math.max(0, next.x)), y: Math.min(1, Math.max(0, next.y)) });
  };

  const imgRect = containedImageRect(boxSize.w, boxSize.h, natural.w, natural.h);
  const pinLeft = imgRect.left + focal.x * imgRect.width;
  const pinTop = imgRect.top + focal.y * imgRect.height;

  return (
    <div
      ref={boxRef}
      aria-label={`${label}. ${Math.round(focal.x * 100)}% from the left, ${Math.round(focal.y * 100)}% from the top. Arrow keys nudge the pin.`}
      tabIndex={0}
      className={cn(
        'relative h-full w-full touch-none cursor-crosshair overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-orange-500',
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={onKeyDown}
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
    </div>
  );
}

export const FOCAL_HINT = "Tap the item's centre";
