'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { Sparkles, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThreeSixtyViewerProps {
  imageUrls: string[];
}

export function ThreeSixtyViewer({ imageUrls }: ThreeSixtyViewerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startIndexRef = useRef(0);

  const totalFrames = imageUrls.length;

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    startXRef.current = clientX;
    startIndexRef.current = activeIndex;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startXRef.current;
    
    // Sensitivity: swipe 30 pixels to change a frame
    const sensitivity = 30;
    const frameOffset = Math.floor(deltaX / sensitivity);
    
    // Calculate new frame with cyclical rotation
    let nextIndex = (startIndexRef.current - frameOffset) % totalFrames;
    if (nextIndex < 0) {
      nextIndex += totalFrames;
    }
    
    setActiveIndex(nextIndex);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  // Bind document-level mouseup/touchend to handle dragging release outside of container
  useEffect(() => {
    if (isDragging) {
      const handleGlobalEnd = () => setIsDragging(false);
      window.addEventListener('mouseup', handleGlobalEnd);
      window.addEventListener('touchend', handleGlobalEnd);
      return () => {
        window.removeEventListener('mouseup', handleGlobalEnd);
        window.removeEventListener('touchend', handleGlobalEnd);
      };
    }
  }, [isDragging]);

  if (totalFrames < 2) return null;

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900/60 backdrop-blur border border-white/10 rounded-2xl max-w-sm mx-auto shadow-2xl relative select-none">
      <div className="text-center mb-3">
        <h4 className="text-xs font-black text-primary uppercase tracking-widest flex items-center justify-center gap-1">
          <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
          Interactive 3D Rotate
        </h4>
        <p className="text-[10px] text-slate-400">Drag or swipe horizontally to rotate the item</p>
      </div>

      {/* Main rotation frame wrapper */}
      <div
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        className={cn(
          "relative w-full aspect-[4/3] rounded-xl overflow-hidden cursor-ew-resize bg-black/40 border border-white/5 flex items-center justify-center transition-all",
          isDragging ? "scale-[1.01] border-primary/20" : ""
        )}
      >
        <Image
          src={imageUrls[activeIndex]}
          fill
          alt={`Rotate frame ${activeIndex + 1}`}
          className="object-contain pointer-events-none"
          unoptimized={imageUrls[activeIndex].startsWith('blob:') || imageUrls[activeIndex].startsWith('data:')}
        />
        
        {/* Swiping cursor instruction overlay */}
        {!isDragging && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center gap-2 pointer-events-none opacity-0 hover:opacity-100 transition-opacity duration-300">
            <Navigation className="h-5 w-5 text-white/80 rotate-90 animate-bounce" />
            <span className="text-[10px] font-bold text-white/95 tracking-wide uppercase">Swipe to spin</span>
            <Navigation className="h-5 w-5 text-white/80 -rotate-90 animate-bounce" />
          </div>
        )}
      </div>

      {/* Manual frame range slider */}
      <div className="w-full mt-4 px-2 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
          <span>Angle {Math.floor((activeIndex / totalFrames) * 360)}°</span>
          <span>Frame {activeIndex + 1} of {totalFrames}</span>
        </div>
        <input
          type="range"
          min="0"
          max={totalFrames - 1}
          value={activeIndex}
          onChange={(e) => setActiveIndex(Number(e.target.value))}
          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
        />
      </div>
    </div>
  );
}
