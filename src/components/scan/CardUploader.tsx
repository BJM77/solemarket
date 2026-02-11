'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Camera, X, Aperture, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CardUploaderProps {
    onImageSelect: (file: File) => void;
    isLoading?: boolean;
}

export default function CardUploader({ onImageSelect, isLoading }: CardUploaderProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const handleFile = useCallback((file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        onImageSelect(file);
    }, [onImageSelect]);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    }, [handleFile]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    }, [handleFile]);

    // Camera Logic
    const startCamera = async () => {
        setIsCameraOpen(true);
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer back camera
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera error:", err);
            setCameraError("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                        handleFile(file);
                        stopCamera();
                    }
                }, 'image/jpeg', 0.9);
            }
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            <Label className="text-sm font-semibold">Upload Card Photo</Label>

            {/* Camera Overlay Modal */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-50 bg-black flex flex-col">
                    <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-contain"
                        />
                        <canvas ref={canvasRef} className="hidden" />

                        {cameraError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-4 text-center">
                                <div>
                                    <p className="mb-4 text-lg">{cameraError}</p>
                                    <Button onClick={stopCamera} variant="secondary">Close</Button>
                                </div>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full w-12 h-12"
                            onClick={stopCamera}
                        >
                            <X className="w-8 h-8" />
                        </Button>
                    </div>

                    <div className="bg-black p-8 flex justify-center items-center gap-8 pb-12">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full w-16 h-16 border-white/50 text-white bg-transparent hover:bg-white/10"
                            onClick={stopCamera}
                        >
                            <X className="w-8 h-8" />
                        </Button>

                        <Button
                            size="icon"
                            className="rounded-full w-24 h-24 bg-white hover:bg-gray-200 text-black border-4 border-gray-300 ring-4 ring-black"
                            onClick={capturePhoto}
                        >
                            <div className="w-20 h-20 rounded-full border-2 border-black/10" />
                        </Button>

                        <div className="w-16" /> {/* Spacer for balance */}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Upload Area - Reduced Size */}
                <div
                    className={`relative border-2 border-dashed rounded-xl p-4 transition-all h-40 flex flex-col items-center justify-center ${dragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {preview ? (
                        <div className="relative w-full h-full rounded-lg overflow-hidden bg-muted group">
                            <img
                                src={preview}
                                alt="Preview"
                                className="w-full h-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        setPreview(null);
                                        const input = document.getElementById('card-upload') as HTMLInputElement;
                                        if (input) input.value = '';
                                    }}
                                >
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Change
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center space-y-2">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    Upload Photo
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                    Drag & drop or click
                                </p>
                            </div>
                        </div>
                    )}

                    <Input
                        id="card-upload"
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleChange}
                        disabled={isLoading}
                    />
                </div>

                {/* Take Picture Button */}
                <Button
                    variant="outline"
                    className="h-40 rounded-xl border-2 border-dashed border-muted hover:border-primary/50 hover:bg-muted/50 flex flex-col items-center justify-center gap-3"
                    onClick={startCamera}
                    disabled={isLoading}
                >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-foreground">Take Picture</p>
                        <p className="text-xs text-muted-foreground mt-1">Open Camera</p>
                    </div>
                </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <ImageIcon className="w-3 h-3" />
                <span>Supports: JPG, PNG, HEIC (max 10MB)</span>
            </div>
        </div>
    );
}
