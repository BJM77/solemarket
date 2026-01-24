'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { Loader, CameraOff, Sparkles, PlusCircle, Gem, Camera, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { extractCardName } from '@/ai/flows/extract-card-name';
import { quickScan } from '@/ai/flows/quick-scan';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { verifyCard } from '@/lib/card-logic';
import type { Player } from '@/lib/research-types';

interface CameraScannerProps {
    playersToKeep: Player[];
    onScanComplete: (
        result: {
            name: string;
            isKeeper: boolean;
            imageDataUri: string;
            brand?: string;
            cardType?: string;
            sport?: string;
            cardYear?: number | null;
            isPrizmRookie?: boolean;
            salesData?: {
                averagePrice?: number | null;
                salesCount?: number | null;
                source?: string | null;
            };
        }
    ) => void;
    onAddNameToKeep: (name: string, sport?: string) => void;
}

type ScanResult = {
    name: string;
    isKeeper: boolean;
    isPrizmRookie?: boolean;
    brand?: string;
    cardType?: string;
    sport?: string;
    cardYear?: number | null;
    imageDataUri?: string;
};

type ProcessingState = 'idle' | 'scanning' | 'verifying';

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
        throw new Error('Could not get canvas context');
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
};

export default function CameraScanner({
    playersToKeep,
    onScanComplete,
    onAddNameToKeep,
}: CameraScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const router = useRouter();
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [processingState, setProcessingState] = useState<ProcessingState>('idle');
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
                        video: { facingMode: 'environment' },
                    });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                } catch (err: any) {
                    console.error('Camera access denied:', err);
                    const errorMessage = 'Camera access denied. Please enable camera permissions in your browser settings.';
                    setCameraError(errorMessage);
                    cleanupCamera();
                    setIsCameraActive(false);
                }
            } else {
                cleanupCamera();
            }
        }
        setupCamera();
        return cleanupCamera;
    }, [isCameraActive, cleanupCamera]);

    const toggleCamera = () => {
        setCameraError(null);
        setIsCameraActive(prev => !prev);
    };

    const handleListOnMarketplace = useCallback(() => {
        if (!scanResult) return;

        // Store scan data in sessionStorage for the create listing page
        const listingData = {
            title: `${scanResult.name}${scanResult.cardYear ? ` ${scanResult.cardYear}` : ''}${scanResult.brand ? ` ${scanResult.brand}` : ''}${scanResult.cardType ? ` ${scanResult.cardType}` : ''}`,
            description: `${scanResult.brand || 'Trading'} Card featuring ${scanResult.name}${scanResult.sport ? ` - ${scanResult.sport}` : ''}${scanResult.cardType ? ` ${scanResult.cardType}` : ''}`,
            category: 'Collector Cards',
            subCategory: 'Trading Cards',
            year: scanResult.cardYear,
            manufacturer: scanResult.brand,
            imageDataUri: scanResult.imageDataUri, // The scanned image
        };

        sessionStorage.setItem('researchScanData', JSON.stringify(listingData));
        router.push('/sell/create?from=research');
    }, [scanResult, router]);

    const scan = useCallback(async () => {
        if (
            processingState !== 'idle' ||
            !videoRef.current ||
            !canvasRef.current ||
            !isCameraActive
        ) {
            return;
        }

        if (!playersToKeep || playersToKeep.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Setup Required',
                description:
                    "Please add players to your 'keep list' before scanning.",
            });
            return;
        }

        setProcessingState('scanning');
        setScanResult(null);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (!context) {
            setProcessingState('idle');
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageDataUri = canvas.toDataURL('image/jpeg');

        try {
            const resizedImage = await resizeImage(imageDataUri);

            const { playerName } = await quickScan({ cardImageDataUri: resizedImage });

            const preliminaryCheck = playersToKeep.find(p => p.name.toLowerCase() === playerName.toLowerCase());

            if (!preliminaryCheck) {
                const result = { name: playerName, isKeeper: false, imageDataUri: resizedImage };
                setScanResult(result);
                setShowResult(true);
                onScanComplete({ ...result, imageDataUri: resizedImage });
                setTimeout(() => setShowResult(false), 3000);
                setProcessingState('idle');
                return;
            }

            setProcessingState('verifying');
            const extractedDetails = await extractCardName({
                cardImageDataUri: resizedImage,
            });

            const { isKeeper, isPrizmRookie } = verifyCard(extractedDetails, playersToKeep);

            const result = {
                name: extractedDetails.playerName,
                isKeeper,
                isPrizmRookie,
                brand: extractedDetails.cardBrand,
                cardType: extractedDetails.cardColor,
                sport: extractedDetails.sport,
                cardYear: extractedDetails.cardYear,
                salesData: extractedDetails.salesData,
                imageDataUri: resizedImage,
            };

            setScanResult(result);
            setShowResult(true);
            onScanComplete({ ...result, imageDataUri: resizedImage });
            setTimeout(() => setShowResult(false), 3000);
        } catch (error: any) {
            console.error('Scan failed:', error);
            let description = 'An unknown error occurred during the scan.';
            if (error instanceof Error) {
                if (error.message.includes('Invalid image format')) {
                    description = 'The image format was invalid. Please try again with a JPEG or PNG.';
                } else if (error.message.includes('could not detect a player name')) {
                    description = 'The AI could not detect a player name on the card. Please try again with a clearer image.';
                } else {
                    description = error.message;
                }
            }
            toast({
                variant: 'destructive',
                title: 'Scan Failed',
                description,
            });
        } finally {
            setProcessingState('idle');
        }
    }, [processingState, playersToKeep, onScanComplete, toast, isCameraActive]);

    const handleAddName = useCallback(() => {
        if (scanResult && !scanResult.isKeeper) {
            onAddNameToKeep(scanResult.name, scanResult.sport);
            setScanResult((prev) => (prev ? { ...prev, isKeeper: true } : null));
        }
    }, [onAddNameToKeep, scanResult]);

    const resultOverlayClasses = cn(
        'absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center transition-opacity duration-300 text-white font-bold text-4xl font-headline tracking-wider',
        {
            'opacity-0 pointer-events-none': !showResult,
            'opacity-100': showResult,
            'bg-gradient-to-br from-yellow-400 via-red-500 to-pink-500': showResult && scanResult?.isPrizmRookie,
            'bg-green-500/80': showResult && scanResult?.isKeeper && !scanResult.isPrizmRookie,
            'bg-red-500/80': showResult && !scanResult?.isKeeper,
        }
    );

    return (
        <div className="w-full max-w-[12rem] aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-2xl relative border-4 border-primary/50 cursor-pointer" onClick={isCameraActive ? scan : toggleCamera}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn('w-full h-full object-cover', !isCameraActive && 'hidden')}
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
                        style={{ aspectRatio: '2.5 / 3.5' }}
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

            {processingState !== 'idle' && !showResult && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <Loader className="w-12 h-12 text-primary-foreground animate-spin mb-4" />
                    <p className="text-primary-foreground text-lg font-semibold">
                        {processingState === 'scanning' ? 'Scanning...' : 'Verifying...'}
                    </p>
                </div>
            )}

            <div className={resultOverlayClasses} onClick={() => setShowResult(false)}>
                {scanResult?.isPrizmRookie ? (
                    <div className="flex flex-col items-center gap-2 animate-pulse">
                        <Gem className="w-12 h-12" />
                        <p className="text-2xl">PRIZM ROOKIE!</p>
                    </div>
                ) : (
                    scanResult?.isKeeper ? 'KEEP' : 'DISCARD'
                )}
                <p className="text-xl font-body font-normal mt-2">
                    {scanResult?.name}
                </p>
                {showResult && scanResult && (
                    <div className="flex flex-col gap-2 mt-4">
                        {!scanResult.isKeeper && (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddName();
                                }}
                                variant="outline"
                                size="sm"
                                className="bg-white/20 hover:bg-white/30 text-white border-white"
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add to Keep List
                            </Button>
                        )}
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleListOnMarketplace();
                            }}
                            size="sm"
                            className="bg-primary hover:bg-primary/90"
                        >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            List on Marketplace
                        </Button>
                    </div>
                )}
            </div>

            <div className="absolute top-2 left-2 bg-black/50 p-2 rounded-lg text-white text-xs flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-accent" />
                <span>AI Active</span>
                <div className={cn('w-2 h-2 rounded-full ml-1', isCameraActive ? 'bg-green-500' : 'bg-red-500')} />
            </div>
            {isCameraActive && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                    Tap screen to scan
                </div>
            )}
            <button onClick={(e) => { e.stopPropagation(); toggleCamera(); }} className="absolute top-2 right-2 bg-black/50 p-2 rounded-full text-white text-xs z-30">
                {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            </button>
        </div>
    );
}
