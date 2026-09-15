import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Box } from 'lucide-react';

interface ScannerSyncOverlayProps {
  capturedImages: string[];
}

export function ScannerSyncOverlay({ capturedImages }: ScannerSyncOverlayProps) {
  return (
    <Card className="bg-zinc-900 border-white/10 overflow-hidden shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-[shimmer_2s_infinite]" />
      <CardContent className="p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
        <Box className="w-8 h-8 text-blue-400 animate-pulse" />
        <div className="text-center space-y-2">
          <h3 className="text-xl font-bold">AI Product Check</h3>
          <p className="text-white/60">Identifying item details and generating description...</p>
        </div>
        <div className="flex gap-2 mt-4">
          {capturedImages.map((src, i) => (
            <img key={i} src={src} className="w-12 h-12 rounded-lg border border-white/10 object-cover" alt="Captured" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
