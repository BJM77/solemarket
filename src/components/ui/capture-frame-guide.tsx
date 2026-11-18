'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/ui';
import { fitGuideRect, getCaptureFrameSpec, type CaptureFrameKind, type Rect } from '@/lib/photo-capture/frame';

interface CaptureFrameGuideProps {
  kind: CaptureFrameKind;
  className?: string;
}

/**
 * Framing guide drawn over a live camera preview. The area outside the guide is
 * dimmed so sellers fill the frame. The guide element is forwarded so the capture
 * code can read its on-screen rect and crop the full-resolution frame to match.
 */
export const CaptureFrameGuide = forwardRef<HTMLDivElement, CaptureFrameGuideProps>(function CaptureFrameGuide(
  { kind, className },
  guideRef,
) {
  const spec = getCaptureFrameSpec(kind);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) setRect(fitGuideRect(width, height, spec.aspect, 0.86, 0.94));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [spec.aspect]);

  return (
    <div ref={containerRef} className={cn('absolute inset-x-0 top-16 bottom-32 pointer-events-none z-30', className)} aria-hidden data-testid="capture-frame-guide" data-frame={kind}>
      {rect && (
        <>
          <div
            ref={guideRef}
            className={cn(
              'absolute border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]',
              spec.round ? 'rounded-full' : 'rounded-xl',
            )}
            style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
          >
            {!spec.round && (
              <>
                <span className="absolute -left-1 -top-1 h-6 w-6 border-l-4 border-t-4 border-orange-500 rounded-tl-xl" />
                <span className="absolute -right-1 -top-1 h-6 w-6 border-r-4 border-t-4 border-orange-500 rounded-tr-xl" />
                <span className="absolute -left-1 -bottom-1 h-6 w-6 border-l-4 border-b-4 border-orange-500 rounded-bl-xl" />
                <span className="absolute -right-1 -bottom-1 h-6 w-6 border-r-4 border-b-4 border-orange-500 rounded-br-xl" />
              </>
            )}
          </div>
          <div
            className="absolute flex justify-center px-2"
            style={{ left: rect.x, width: rect.width, top: rect.y + rect.height * (spec.round ? 0.14 : 0) + 10 }}
          >
            <span className="rounded-full bg-black/60 px-3 py-1 text-center text-[11px] font-semibold leading-tight text-white backdrop-blur-sm" data-testid="capture-frame-hint">
              {spec.hint}
            </span>
          </div>
        </>
      )}
    </div>
  );
});
