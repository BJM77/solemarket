'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, VideoOff, Trash2, CheckCircle, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ARCameraOverlay } from '@/components/ar-camera-overlay';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface CameraCaptureProps {
    onCapture: (files: File[]) => void;
    maxSizeMB?: number;
    captureMode?: 'card' | 'coin' | 'general' | 'default';
    variant?: 'button' | 'hero';
    maxFiles?: number;
}

export function CameraCapture({ onCapture, maxSizeMB = 10, captureMode = 'default', variant = 'button', maxFiles = 4 }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraLoading, setIsCameraLoading] = useState(false);

    // Multi-shot state
    const [capturedFiles, setCapturedFiles] = useState<File[]>([]);
    const [capturedPreviews, setCapturedPreviews] = useState<string[]>([]);

    const { toast } = useToast();

    // Track previews for cleanup to avoid closure staleness on unmount
    const previewsRef = useRef<string[]>([]);
    useEffect(() => {
        previewsRef.current = capturedPreviews;
    }, [capturedPreviews]);

    // Cleanup previews strictly on unmount
    useEffect(() => {
        return () => {
            previewsRef.current.forEach(url => URL.revokeObjectURL(url));
        };
    }, []);

    // Cleanup stream on unmount or stream change
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    // Check for iOS Safari specifics on mount
    useEffect(() => {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isIOS && isSafari) {
            // iOS Safari requires https or localhost
            if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
                setError('Camera requires HTTPS on iOS Safari');
            }
        }
    }, []);


    const startCamera = useCallback(async (deviceId: string) => {
        setIsCameraLoading(true);
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setError(null);

        try {
            // Constraints with fallback support
            const constraints: MediaStreamConstraints = {
                video: {
                    deviceId: deviceId ? { exact: deviceId } : undefined,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: { ideal: 16 / 9 },
                    facingMode: deviceId ? undefined : 'environment' // Default to back camera
                }
            };

            const newStream = await navigator.mediaDevices.getUserMedia(constraints);
            setStream(newStream);
            setHasCameraPermission(true);

            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
                // iOS Safari requires playing immediately
                await videoRef.current.play();
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
        } catch (err: any) {
            console.error("Error accessing camera:", err);

            // Retry with simpler constraints if it failed
            if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                try {
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setStream(fallbackStream);
                    setHasCameraPermission(true);
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                        await videoRef.current.play();
                    }
                } catch (fallbackErr) {
                    setError("Could not access camera even with fallback settings.");
                    setHasCameraPermission(false);
                }
            } else {
                setError("Could not access the selected camera. It might be in use or permissions are denied.");
                setHasCameraPermission(false);
            }
        } finally {
            setIsCameraLoading(false);
        }
    }, [stream]);

    const initializeCamera = useCallback(async () => {
        setCapturedPreviews([]);
        setCapturedFiles([]);
        if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
            setError("Camera access is not supported by your browser.");
            setHasCameraPermission(false);
            return;
        }
        try {
            // iOS Safari: Check for Permission specifically if possible, otherwise just try
            // Note: navigator.permissions is not fully supported on iOS Safari yet, so we proceed to try getUserMedia

            // Try to get initial stream to prompt permission
            setIsCameraLoading(true);
            await navigator.mediaDevices.getUserMedia({ video: true }).then(s => s.getTracks().forEach(t => t.stop()));
            setHasCameraPermission(true);

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            if (videoDevices.length === 0) {
                setError("No camera devices found.");
                setHasCameraPermission(false);
                return;
            }

            setCameras(videoDevices);
            const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back'));
            const selectedDeviceId = backCamera ? backCamera.deviceId : videoDevices[0].deviceId;
            setSelectedCamera(selectedDeviceId);
            await startCamera(selectedDeviceId);
        } catch (err) {
            console.error("Camera initialization failed:", err);
            setHasCameraPermission(false);
            setError("Camera permission was denied. Please enable it in your browser settings.");
        } finally {
            setIsCameraLoading(false);
        }
    }, [startCamera]);

    const stopStream = useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (open) {
            initializeCamera();
        } else {
            stopStream();
        }
    };

    const takePhoto = () => {
        if (!videoRef.current || !canvasRef.current || capturedFiles.length >= maxFiles) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Reset canvas dimensions to match the current video frame
        canvas.width = videoWidth;
        canvas.height = videoHeight;

        // Clear any previous drawing
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.drawImage(video, 0, 0, videoWidth, videoHeight);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
                if (file.size > maxSizeMB * 1024 * 1024) {
                    toast({ title: 'Image too large', description: `The captured photo exceeds the ${maxSizeMB}MB limit.`, variant: 'destructive' });
                    return;
                }
                setCapturedFiles(prev => [...prev, file]);
                setCapturedPreviews(prev => [...prev, URL.createObjectURL(file)]);
            }
        }, 'image/jpeg', 0.9);
    };

    const removeCapturedImage = (indexToRemove: number) => {
        const urlToRemove = capturedPreviews[indexToRemove];
        URL.revokeObjectURL(urlToRemove);
        setCapturedPreviews(prev => prev.filter((_, index) => index !== indexToRemove));
        setCapturedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleDone = () => {
        onCapture(capturedFiles);
        setIsDialogOpen(false);
        stopStream();
    };

    return (
        <>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    {variant === 'hero' ? (
                        <div className="group relative aspect-square sm:aspect-video rounded-3xl border-2 border-solid border-indigo-600 bg-indigo-600/5 hover:bg-indigo-600/10 cursor-pointer flex flex-col items-center justify-center text-center p-6 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]">
                            <div className="bg-indigo-600 p-5 rounded-full shadow-lg shadow-indigo-200 mb-4 group-hover:scale-110 transition-transform">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-xl font-black text-indigo-900 tracking-tight">Use Camera</h3>
                            <p className="text-sm font-medium text-indigo-600/70 mt-2 max-w-[200px]">
                                Snap a photo from your <span className="font-bold">mobile device</span> or <span className="font-bold">computer camera</span>
                            </p>
                        </div>
                    ) : (
                        <Button variant="outline" className="gap-2">
                            <Camera className="w-4 h-4" /> Take Photo
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden bg-black border-slate-800">
                    <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                        <div className="text-white">
                            <DialogTitle className="text-lg font-bold">Camera</DialogTitle>
                            <DialogDescription className="text-white/60 text-xs">
                                {capturedFiles.length} / {maxFiles} photos taken
                            </DialogDescription>
                        </div>
                        {cameras.length > 1 && (
                            <Select value={selectedCamera} onValueChange={(value) => { setSelectedCamera(value); startCamera(value); }} disabled={!hasCameraPermission}>
                                <SelectTrigger className="w-[140px] h-8 bg-white/10 border-white/20 text-white text-xs backdrop-blur-md">
                                    <SelectValue placeholder="Switch Camera" />
                                </SelectTrigger>
                                <SelectContent>
                                    {cameras.map((cam, idx) => (
                                        <SelectItem key={cam.deviceId || idx} value={cam.deviceId || `cam-${idx}`}>
                                            {cam.label || `Camera ${idx + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                        <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-white/70 hover:text-white" onClick={() => setIsDialogOpen(false)}><X /></Button>
                    </div>

                    <div className="relative w-full h-[60vh] md:h-[70vh] bg-black flex items-center justify-center overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline // REQUIRED for iOS Safari
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                        {isCameraLoading && (
                            <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50">
                                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                            </div>
                        )}
                        {hasCameraPermission === false && !isCameraLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center z-40">
                                <VideoOff className="h-12 w-12 text-red-500 mb-4" />
                                <h3 className="text-white font-bold mb-2">Camera Access Denied</h3>
                                <p className="text-white/60 text-sm">{error || "Please check your browser settings."}</p>
                            </div>
                        )}
                        {hasCameraPermission && !isCameraLoading && <ARCameraOverlay guideType={captureMode === 'default' ? 'card' : captureMode} />}

                        <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50">
                            <button
                                onClick={takePhoto}
                                disabled={!stream || !hasCameraPermission || capturedFiles.length >= maxFiles || isCameraLoading}
                                className={cn(
                                    "w-20 h-20 rounded-full border-4 border-white flex items-center justify-center transition-all active:scale-95",
                                    (capturedFiles.length >= maxFiles || isCameraLoading) ? "opacity-50 cursor-not-allowed border-slate-500" : "hover:bg-white/20"
                                )}
                            >
                                <div className="w-16 h-16 rounded-full bg-white shadow-lg" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-slate-950 p-4 border-t border-white/10">
                        <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/20">
                            {capturedPreviews.map((url, idx) => (
                                <div key={url} className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-white/20 group">
                                    <Image src={url} alt={`Capture ${idx}`} className="w-full h-full object-cover" width={64} height={64} style={{ WebkitUserSelect: 'none', WebkitTransform: 'translateZ(0)' }} />
                                    <button
                                        onClick={() => removeCapturedImage(idx)}
                                        className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-6 h-6 text-white" />
                                    </button>
                                    <Badge className="absolute bottom-0 right-0 rounded-none rounded-tl-md bg-indigo-600 px-1 py-0 text-[10px]">
                                        {idx + 1}
                                    </Badge>
                                </div>
                            ))}
                            {capturedFiles.length < maxFiles && (
                                <div className="w-16 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 text-xs">
                                    {maxFiles - capturedFiles.length} left
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 mt-2">
                            <Button
                                variant="outline"
                                className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                onClick={handleDone}
                                disabled={capturedFiles.length === 0}
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Add {capturedFiles.length} Photo{capturedFiles.length !== 1 && 's'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
            <canvas ref={canvasRef} className="hidden" />
        </>
    );
}