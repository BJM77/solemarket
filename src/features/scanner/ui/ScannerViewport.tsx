import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Camera, Zap, ZapOff, Loader2, Layers } from 'lucide-react';
import { cn } from "@/lib/utils/ui";
import { useRouter } from 'next/navigation';

interface ScannerViewportProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isProcessing: boolean;
  labStatus: string;
  torchActive: boolean;
  onToggleTorch: () => void;
  onCapture: () => void;
  currentSequenceStepName: string;
  cameraCollapsed: boolean;
  onReset: () => void;
  reviewRoute?: string;
  renderOverlay?: () => React.ReactNode;
}

export function ScannerViewport({
  videoRef,
  isProcessing,
  labStatus,
  torchActive,
  onToggleTorch,
  onCapture,
  currentSequenceStepName,
  cameraCollapsed,
  onReset,
  reviewRoute,
  renderOverlay
}: ScannerViewportProps) {
  const router = useRouter();

  if (cameraCollapsed) {
    return (
      <div className="h-[120px] overflow-hidden rounded-b-3xl opacity-50 scale-[0.98] transition-all duration-500 ease-in-out relative bg-zinc-900">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={onReset}>
          <div className="flex flex-col items-center gap-2">
            <Camera className="w-8 h-8 text-white/80" />
            <span className="text-sm">Tap to Resume Camera</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[800px] transition-all duration-500 ease-in-out origin-top relative bg-zinc-900">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      
      {/* Dynamic Overlay logic */}
      {renderOverlay ? renderOverlay() : (
          <>
            {currentSequenceStepName === 'MAIN' && <div className="absolute inset-8 border-2 border-dashed border-white/30 rounded-2xl pointer-events-none" />}
            {currentSequenceStepName === 'DETAIL' && <div className="absolute inset-x-8 top-1/4 bottom-1/4 border border-white/50 rounded-full pointer-events-none" />}
            {currentSequenceStepName === 'FRONT' && <div className="absolute inset-8 border-2 border-solid border-white/50 rounded-xl pointer-events-none" />}
            {currentSequenceStepName === 'BACK' && <div className="absolute inset-8 border-2 border-dashed border-white/50 rounded-xl pointer-events-none" />}
          </>
      )}
      
      <div className="absolute top-6 inset-x-0 flex justify-center gap-2 pointer-events-none z-20">
        <Badge className="bg-black/50 text-white">
          {currentSequenceStepName}
        </Badge>
        {isProcessing && (
            <Badge className="bg-yellow-500/80 text-white">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {labStatus}
            </Badge>
        )}
      </div>

      <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center justify-end bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-between w-full max-w-[320px]">
          <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-white/5" onClick={onToggleTorch}>
            {torchActive ? <Zap className="w-5 h-5 text-yellow-400" /> : <ZapOff className="w-5 h-5" />}
          </Button>
          <Button size="icon" disabled={isProcessing} onClick={onCapture} className="w-20 h-20 rounded-full border-4 border-white bg-white/20">
            <div className="absolute inset-2 bg-white rounded-full transition-transform active:scale-90" />
          </Button>
          {reviewRoute ? (
             <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl bg-white/5" onClick={() => router.push(reviewRoute)}>
               <Layers className="w-5 h-5 text-white/70" />
             </Button>
          ) : <div className="w-12" />}
        </div>
      </div>
    </div>
  );
}
