"use client";

import React, { useRef, useEffect, useState, useCallback, ReactNode } from "react";
import { Camera, CameraOff, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/samcam/hooks/use-toast";
import { cn } from "@/lib/utils/ui";;

export interface ScannerCoreProps {
  onCapture: (imageDataUri: string) => Promise<void> | void;
  processingState: "idle" | "scanning" | "verifying";
  overlay?: ReactNode;
  captureButtonText?: string;
  autoStart?: boolean;
}

export const resizeImage = async (dataUri: string, maxWidth = 800): Promise<string> => {
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

export default function ScannerCore({
  onCapture,
  processingState,
  overlay,
  captureButtonText = "Scan Item",
  autoStart = false
}: ScannerCoreProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(autoStart);
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
            let errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
             if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Camera access was denied. Please allow camera permissions.';
              } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'No camera found on this device.';
              }
            setCameraError(errorMessage);
            toast({
              variant: "destructive",
              title: "Camera Error",
              description: errorMessage,
            });
            cleanupCamera();
            setIsCameraActive(false);
        }
       } else {
         cleanupCamera();
       }
    }
    setupCamera();
    return cleanupCamera;
  }, [isCameraActive, cleanupCamera, toast]);

  const toggleCamera = () => {
    setCameraError(null);
    setIsCameraActive(prev => !prev);
  }

  const handleCapture = useCallback(async () => {
    if (
      processingState !== "idle" ||
      !videoRef.current ||
      !canvasRef.current ||
      !isCameraActive
    ) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUri = canvas.toDataURL("image/jpeg");
    
    try {
      const resizedImage = await resizeImage(imageDataUri);
      await onCapture(resizedImage);
    } catch (error: any) {
      console.error("Capture failed:", error);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: error.message || "An error occurred during capture.",
      });
    }
  }, [processingState, onCapture, isCameraActive, toast]);

  return (
    <div className="relative w-full max-w-md mx-auto aspect-[3/4] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-center border-4 border-slate-800">
      {/* Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          isCameraActive ? "opacity-100" : "opacity-0"
        )}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlays */}
      {isCameraActive && overlay}

      {/* Loading States */}
      {processingState !== "idle" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Sparkles className="h-12 w-12 text-primary animate-pulse mb-4" />
          <p className="text-white font-bold tracking-widest uppercase">
            {processingState === "scanning" ? "Analyzing..." : "Verifying..."}
          </p>
        </div>
      )}

      {/* Inactive State */}
      {!isCameraActive && !cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
          <CameraOff className="h-16 w-16 text-slate-600 mb-4" />
          <p className="text-slate-400 font-medium mb-6">Camera is currently off</p>
          <Button onClick={toggleCamera} size="lg" className="rounded-full font-bold px-8">
            <Camera className="mr-2 h-5 w-5" /> Enable Camera
          </Button>
        </div>
      )}

      {/* Error State */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-red-950/20">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
          <p className="text-red-400 font-medium text-sm mb-6 max-w-xs">{cameraError}</p>
          <Button onClick={toggleCamera} variant="outline" size="lg" className="rounded-full font-bold px-8">
            Try Again
          </Button>
        </div>
      )}

      {/* Capture Controls */}
      {isCameraActive && (
        <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex justify-center z-30">
          <Button
            onClick={handleCapture}
            disabled={processingState !== "idle"}
            size="lg"
            className={cn(
              "rounded-full font-bold px-8 h-14 text-lg shadow-xl shadow-primary/20",
              processingState !== "idle" ? "opacity-50" : "hover:scale-105 transition-transform"
            )}
          >
            {processingState !== "idle" ? (
              <span className="flex items-center gap-2 animate-pulse">
                <Sparkles className="h-5 w-5" /> Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5" /> {captureButtonText}
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
