'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Sparkles, AlertCircle } from 'lucide-react';

interface Defect {
  x: number;
  y: number;
  description: string;
  imageIndex: number;
}

interface AICardDefectOverlayProps {
  imageUrl: string;
  defects?: Defect[];
  imageIndex: number;
}

export function AICardDefectOverlay({ imageUrl, defects = [], imageIndex }: AICardDefectOverlayProps) {
  const [activeDefect, setActiveDefect] = useState<Defect | null>(null);

  const activeDefectsOnThisImage = defects.filter(d => d.imageIndex === imageIndex);

  return (
    <div className="relative w-full aspect-[3/4] max-w-sm mx-auto bg-slate-950 rounded-2xl overflow-hidden border border-white/10 group select-none shadow-2xl">
      {/* Main card image */}
      <div className="relative w-full h-full">
        <Image 
          src={imageUrl} 
          fill 
          alt={`Card photo ${imageIndex + 1}`} 
          className="object-contain" 
          unoptimized={imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')}
        />
      </div>

      {/* Defect overlay pins */}
      <div className="absolute inset-0 pointer-events-auto">
        {activeDefectsOnThisImage.map((defect, idx) => (
          <div
            key={idx}
            style={{ left: `${defect.x}%`, top: `${defect.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
          >
            {/* Outer pulsing ring */}
            <span className="absolute inline-flex h-6 w-6 rounded-full bg-red-500/30 animate-ping opacity-75" />
            
            {/* Inner clickable radar point */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveDefect(activeDefect === defect ? null : defect);
              }}
              className="relative flex items-center justify-center h-4 w-4 rounded-full bg-red-500 hover:bg-red-400 hover:scale-110 active:scale-95 shadow-md shadow-red-500/30 border border-white transition-all cursor-pointer"
            >
              <span className="text-[8px] font-black text-white">!</span>
            </button>

            {/* Hover tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block pointer-events-none z-20">
              <div className="bg-slate-900/95 backdrop-blur border border-red-500/30 text-white text-[10px] font-medium py-1.5 px-3 rounded-lg shadow-xl w-36 text-center leading-snug">
                {defect.description}
              </div>
              <div className="w-2 h-2 bg-slate-900 border-r border-b border-red-500/30 absolute left-1/2 -translate-x-1/2 -translate-y-1 rotate-45" />
            </div>
          </div>
        ))}
      </div>

      {/* Floating active defect description card on top or bottom */}
      {activeDefect && (
        <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur border border-red-500/30 p-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-2 duration-300 flex items-start gap-2.5 z-30">
          <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h6 className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-red-400 animate-pulse" />
              AI Defect Detection
            </h6>
            <p className="text-xs font-semibold text-white leading-relaxed">{activeDefect.description}</p>
            <p className="text-[8px] text-slate-400">Position: ({activeDefect.x}%, {activeDefect.y}%)</p>
          </div>
        </div>
      )}
    </div>
  );
}
