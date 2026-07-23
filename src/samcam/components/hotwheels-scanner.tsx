
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Loader, CameraOff, Sparkles, Gem, Camera } from "lucide-react";
import { cn } from "@/samcam/lib/utils";
import { useToast } from "@/samcam/hooks/use-toast";
import { Button } from "@/samcam/components/ui/button";
import { scanHotWheels } from "@/samcam/ai/flows/scan-hot-wheels";
import { treasureHunts, superTreasureHunts } from "@/samcam/lib/hotwheels-data";

interface HotWheelsScannerProps {
  onError: (message: string) => void;
}

type ScanResult = {
  carName: string;
  year?: number;
  isSpecialEdition: boolean;
  specialEditionInfo?: string;
};

// --- Helper Functions for more robust matching ---

/**
 * Normalizes a car name for comparison.
 * - Converts to lowercase
 * - Removes punctuation and extra spaces
 * @param name The string to normalize.
 * @returns The normalized string.
 */
const normalize = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ')     // Collapse whitespace
        .trim();
};

// Pre-process the lists for efficient lookup
const regularHuntSet = new Set(treasureHunts.map(hunt => normalize(hunt.name)));
const superHuntSet = new Set(superTreasureHunts.map(hunt => normalize(hunt.name)));


const resizeImage = async (dataUri: string, maxWidth = 800): Promise<string> => {
    const img = new Image();
    img.src = dataUri;
    await new Promise((resolve) => { img.onload = resolve; });

    if (img.width <= maxWidth) {
        return dataUri;
    }

    const canvas = document.createElement('canvas');
    const scale = maxWidth / img.width;
    canvas.width = maxWidth;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
};

export default function HotWheelsScanner({
  onError,
}: HotWheelsScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const { toast } = useToast();

  const cleanupCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    async function setupCamera() {
      if (isCameraActive) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            });
            if (videoRef.current) {
            videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("Camera access denied:", err);
            const errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
            setCameraError(errorMessage);
            onError(`Camera Error: ${err.message || errorMessage}`);
            cleanupCamera();
            setIsCameraActive(false);
        }
      } else {
        cleanupCamera();
      }
    }
    setupCamera();
    return cleanupCamera;
  }, [isCameraActive, cleanupCamera, onError]);

  const toggleCamera = () => {
    setCameraError(null);
    setIsCameraActive(prev => !prev);
  }

  const checkTreasureHunt = (carName: string) => {
    const normalizedCarName = normalize(carName);
    
    if (superHuntSet.has(normalizedCarName)) {
      return { isSpecialEdition: true, specialEditionInfo: "Super Treasure Hunt" };
    }
    if (regularHuntSet.has(normalizedCarName)) {
      return { isSpecialEdition: true, specialEditionInfo: "Treasure Hunt" };
    }
    
    return { isSpecialEdition: false };
  };

  const scan = useCallback(async () => {
    if (
      isProcessing ||
      !videoRef.current ||
      !canvasRef.current ||
      !isCameraActive
    ) {
      return;
    }

    setIsProcessing(true);
    setScanResult(null);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setIsProcessing(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL("image/jpeg");
    
    try {
      const resizedImage = await resizeImage(imageDataUri);
      
      const { carName, year } = await scanHotWheels({ imageDataUri: resizedImage });
      
      const huntResult = checkTreasureHunt(carName);

      const result = {
        carName,
        year,
        ...huntResult
      };

      setScanResult(result);
      setShowResult(true);
      setTimeout(() => setShowResult(false), 4000);
    } catch (error: any) {
      console.error("Scan failed:", error);
      let description = "An unknown error occurred during the scan.";
      if (error instanceof Error) {
        description = error.message;
      }
      onError(`Scan Failed: ${description}`);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description,
      });
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, toast, onError, isCameraActive]);

  const resultOverlayClasses = cn(
    "absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center transition-opacity duration-300 text-white font-bold text-4xl font-headline tracking-wider",
    {
      "opacity-0 pointer-events-none": !showResult,
      "opacity-100": showResult,
      "bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500": showResult && scanResult?.isSpecialEdition,
      "bg-blue-500/80": showResult && !scanResult?.isSpecialEdition,
    }
  );

  return (
    <div className="w-full max-w-[12rem] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl relative border-4 border-primary/50 cursor-pointer" onClick={isCameraActive ? scan : toggleCamera}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn("w-full h-full object-cover", !isCameraActive && "hidden")}
      />
      <canvas ref={canvasRef} className="hidden" />

      {!isCameraActive && (
         <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
            <Camera className="w-16 h-16 text-primary-foreground mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Camera Off</h3>
            <p className="text-muted-foreground">Click to start camera</p>
        </div>
      )}

      {isCameraActive && (
        <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
            <div
            className="w-full h-auto border-2 border-dashed border-white/50 rounded-xl"
            style={{ aspectRatio: "2.5 / 3.5" }}
            />
        </div>
      )}

      {cameraError && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-center p-4">
          <CameraOff className="w-16 h-16 text-destructive mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Camera Error</h3>
          <p className="text-muted-foreground">{cameraError}</p>
        </div>
      )}

      {isProcessing && !showResult && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <Loader className="w-12 h-12 text-primary-foreground animate-spin mb-4" />
          <p className="text-primary-foreground text-lg font-semibold">Scanning...</p>
        </div>
      )}

      <div className={resultOverlayClasses} onClick={() => setShowResult(false)}>
        {scanResult?.isSpecialEdition ? (
          <div className="flex flex-col items-center gap-2">
            <Gem className="w-12 h-12" />
            <p className="text-3xl">Possible TH</p>
            <p className="text-base font-body font-normal">Worth looking closer at this vehicle</p>
          </div>
        ) : (
          scanResult && "Regular Edition"
        )}
        <p className="text-xl font-body font-normal mt-2">
          {scanResult?.carName} {scanResult?.year && `(${scanResult.year})`}
        </p>
      </div>

       <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-lg text-white text-xs flex items-center gap-1">
        <Sparkles className="w-4 h-4 text-accent" />
        <span>AI Active</span>
        <div className={cn("w-2 h-2 rounded-full ml-1", isCameraActive ? "bg-green-500" : "bg-red-500")} />
      </div>
      {isCameraActive && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
            Tap screen to scan
        </div>
      )}
      <button onClick={(e) => {e.stopPropagation(); toggleCamera();}} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white text-xs">
        {isCameraActive ? <CameraOff className="w-4 h-4"/> : <Camera className="w-4 h-4"/>}
      </button>
    </div>
  );
}
