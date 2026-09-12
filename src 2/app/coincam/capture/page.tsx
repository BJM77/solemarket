"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Target, 
  Sun, 
  Gauge, 
  Flame, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Layers, 
  Trash2, 
  Smartphone, 
  Contrast, 
  Eye, 
  EyeOff, 
  Settings,
  Thermometer,
  Zap,
  ZapOff,
  Info,
  Clock,
  XCircle,
  FileText,
  ListChecks,
  Save,
  Gem,
  BadgeCheck,
  Camera,
  SkipForward,
  Send,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/samcam/hooks/use-toast";
import { db, auth } from "@/samcam/lib/firebase";
import { syncStorage, PendingUpload } from "@/coincam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { analyzeImageQuality, QualityMetrics } from "@/samcam/lib/image-processing";
import { detectDevice, getProfileForPreset, DeviceProfile } from "@/samcam/lib/device-detector";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker, SyncStatus } from "@/samcam/components/sync-status-tracker";
import { syncService, SyncResult } from "@/coincam/lib/sync-service";
import { audioSynth } from "@/samcam/lib/audio-effects";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/coincam/auth-provider";

// ─── Types ────────────────────────────────────────────────────────────
type BoothStep = 'CAPTURE' | 'REVIEW' | 'SUBMITTING';

interface ReviewData {
  docId: string;
  frontUrl: string;
  backUrl: string;
  coinName: string;
  setName: string;
  denomination: string;
  country: string;
  year: number | undefined;
  mintMark: string;
  composition: string;
  rarity: string;
  isRare: boolean;
  description: string;
  price: number | undefined;
  condition: string;
  subCategory: string;
  brand: string;
  model: string;
  isMultiCoin: boolean;
  coinCount: number;
  identificationSource: string;
  identificationConfidence: number;
}

// ─── Camera Constraints ──────────────────────────────────────────────
const getCameraConstraints = (device: DeviceProfile) => {
  const constraints: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 16/9 },
  };

  if (device.manufacturer === 'apple') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
        { 'com.apple.capture.session.preset': 'photo' },
        { 'com.apple.capture.quality': 1.0 },
      ],
    };
  }

  if (device.manufacturer === 'samsung') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
        { 'com.samsung.android.camera.softening': 0.5 },
        { 'com.samsung.android.camera.macro': true },
      ],
    };
  }

  if (device.manufacturer === 'google') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
        { 'com.google.android.camera.hdrplus': true },
        { 'com.google.android.camera.ai_auto': true },
        { 'com.google.android.camera.macro': true },
      ],
    };
  }

  return {
    ...constraints,
    // @ts-ignore
    advanced: [
      { focusMode: 'continuous' },
      { exposureMode: 'auto' },
      { whiteBalanceMode: 'auto' },
    ],
  };
};

// ─── Main Component ──────────────────────────────────────────────────
export default function CoinPhotoBooth() {
  // Booth stepper state
  const [boothStep, setBoothStep] = useState<BoothStep>('CAPTURE');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [cameraCollapsed, setCameraCollapsed] = useState(false);

  // Capture state
  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
  const [lastQuality, setLastQuality] = useState<QualityMetrics | null>(null);
  const [currentSide, setCurrentSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [tempCapture, setTempCapture] = useState<Blob | null>(null);
  const [torchActive, setTorchActive] = useState(false);
  const [sessionThumbnails, setSessionThumbnails] = useState<string[]>([]);
  const [focusState, setFocusState] = useState<'idle' | 'focusing' | 'locked'>('idle');
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

  // Captured image previews for review panel
  const [capturedFrontPreview, setCapturedFrontPreview] = useState<string | null>(null);
  const [capturedBackPreview, setCapturedBackPreview] = useState<string | null>(null);

  // Active upload ID we're watching for the inline review
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const activeUploadRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("Failed to revoke URL", url, e);
        }
      });
    };
  }, []);
  
  const [selectedDevice, setSelectedDevice] = useState<string>('auto');
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>({
    name: 'Generic Device',
    manufacturer: 'generic',
    model: 'unknown',
    isHighEnd: false,
    hasMacroMode: false,
    hasNightMode: false,
    recommendedAspectRatio: '16:9',
    recommendedResolution: { width: 1920, height: 1080 },
    aiAcceleration: 'basic',
  });
  const [showHUD, setShowHUD] = useState(true);
  const [hudPosition, setHudPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [qualityHistory, setQualityHistory] = useState<QualityMetrics[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brightnessThreshold, setBrightnessThreshold] = useState(50);
  const [focusThreshold, setFocusThreshold] = useState(50);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const errorLog = useErrorLog();
  const { user } = useAuth();

  // Evaluate active device profile based on selection
  useEffect(() => {
    if (selectedDevice === 'auto') {
      setDeviceProfile(detectDevice());
    } else {
      setDeviceProfile(getProfileForPreset(selectedDevice));
    }
  }, [selectedDevice]);

  // Robust Camera Lifecycle driven by profile constraints
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const constraints = getCameraConstraints(deviceProfile);
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints as any });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        if (stream) {
          videoTrackRef.current = stream.getVideoTracks()[0];
        }
      } catch (err: any) {
        console.error("Camera access failed", err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          if (stream) {
            videoTrackRef.current = stream.getVideoTracks()[0];
          }
        } catch (innerErr: any) {
          toast({ 
            variant: "destructive", 
            title: "Camera Error", 
            description: innerErr.message || "Please enable camera permissions." 
          });
        }
      }
    };
    
    startCamera();
    syncStorage.getAll().then(setSyncQueue);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoTrackRef.current = null;
    };
  }, [deviceProfile, toast]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleFocus = () => {
      setFocusState('locked');
      setTimeout(() => setFocusState('idle'), 1000);
    };

    video.addEventListener('focus', handleFocus);
    video.addEventListener('focusin', handleFocus);

    return () => {
      video.removeEventListener('focus', handleFocus);
      video.removeEventListener('focusin', handleFocus);
    };
  }, []);

  const triggerVibrate = (pattern: number | number[]) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      console.warn("Haptic vibration blocked by environment", e);
    }
  };

  const toggleTorch = async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) {
        toast({ title: "Torch Not Ready", description: "Camera stream is initializing." });
        return;
      }
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
      if (capabilities && (capabilities as any).torch) {
        const nextState = !torchActive;
        await track.applyConstraints({
          advanced: [{ torch: nextState }]
        } as any);
        setTorchActive(nextState);
        audioSynth.playChime();
      } else {
        toast({ title: "Torch Not Supported", description: "Your device camera does not support browser-controlled torch light." });
      }
    } catch (e) {
      console.error("Failed to toggle torch", e);
    }
  };

  // Background Queue Uploader with Stepper Status + AI Result Capture
  useEffect(() => {
    let isQueueProcessing = false;

    const processQueue = async () => {
      if (isQueueProcessing || syncQueue.length === 0) return;
      
      const activeItem = syncQueue.find(i => i.status === 'PENDING' || i.status === 'ERROR');
      if (!activeItem) return;
      
      // Check if already processing in the service
      const existingStatus = syncService.getActiveSync(activeItem.id);
      if (existingStatus) {
        setSyncStatuses(prev => new Map(prev).set(activeItem.id, existingStatus));
        return;
      }

      isQueueProcessing = true;

      try {
        const result: SyncResult = await syncService.processUpload(
          activeItem,
          deviceProfile,
          (status) => {
            // Update UI with status update from worker
            setSyncStatuses(prev => new Map(prev).set(activeItem.id, status));
          }
        );

        if (result.success) {
          audioSynth.playChime();
          // Remove from queue
          setSyncQueue(prev => prev.filter(i => i.id !== activeItem.id));
          // Remove from sync statuses in UI after a success delay
          setTimeout(() => {
            setSyncStatuses(prev => {
              const next = new Map(prev);
              next.delete(activeItem.id);
              return next;
            });
          }, 6000);

          // If this is the coin we're actively watching, populate review form
          if (activeUploadRef.current === activeItem.id && result.aiResult) {
            const ai = result.aiResult;
            setReviewData({
              docId: result.docId || activeItem.id,
              frontUrl: result.frontUrl || '',
              backUrl: result.backUrl || '',
              coinName: ai.coinName || '',
              setName: ai.setName || '',
              denomination: ai.denomination || '',
              country: ai.country || '',
              year: ai.year || undefined,
              mintMark: ai.mintMark || '',
              composition: ai.composition || '',
              rarity: ai.rarity || '',
              isRare: ai.isRare || false,
              description: ai.description || '',
              price: ai.price || undefined,
              condition: ai.condition || 'New',
              subCategory: ai.subCategory || 'Australian Coins',
              brand: ai.brand || 'Royal Australian Mint',
              model: ai.model || '',
              isMultiCoin: ai.isMultiCoin || false,
              coinCount: ai.coinCount || 1,
              identificationSource: ai.identificationSource || 'AI_FALLBACK',
              identificationConfidence: ai.identificationConfidence || 0,
            });
            setBoothStep('REVIEW');
            setAiScanning(false);
            // Scroll to review panel
            setTimeout(() => {
              reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
          }
        } else {
          // Update status to error in database queue
          const updated = { ...activeItem, status: 'ERROR' as const, retries: activeItem.retries + 1 };
          await syncStorage.update(updated);
          setSyncQueue(prev => prev.map(i => i.id === activeItem.id ? updated : i));
          
          // If this was the active upload, still go to review with empty fields
          if (activeUploadRef.current === activeItem.id) {
            setBoothStep('REVIEW');
            setAiScanning(false);
            toast({ variant: "destructive", title: "AI Identification Failed", description: "You can fill in the details manually or run AI Check again." });
          }
        }
      } catch (error) {
        console.error("[Queue] Processing error:", error);
      } finally {
        isQueueProcessing = false;
      }
    };

    const interval = setInterval(processQueue, 2000);
    return () => clearInterval(interval);
  }, [syncQueue, deviceProfile, toast]);

  const capture = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);
    setLabStatus("LOCKING...");

    try {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      
      c.width = 800; 
      c.height = 800;
      const ctx = c.getContext('2d', { alpha: false })!;
      
      const xOffset = (v.videoWidth - 800) / 2;
      const yOffset = (v.videoHeight - 800) / 2;
      ctx.drawImage(v, xOffset, yOffset, 800, 800, 0, 0, 800, 800);

      // Run image analysis in the background, non-blocking
      const imageData = ctx.getImageData(0, 0, 800, 800);
      analyzeImageInBackground(imageData, c).then((q) => {
        setLastQuality(q);
        setQualityHistory(prev => [...prev.slice(-9), q]);
      }).catch(err => console.warn('Background analysis failed:', err));

      c.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setLabStatus("READY");
          return;
        }

        audioSynth.playShutter();
        triggerVibrate(60);

        const objectUrl = URL.createObjectURL(blob);
        createdUrlsRef.current.push(objectUrl);

        if (currentSide === 'FRONT') {
          setTempCapture(blob);
          setCurrentSide('BACK');
          setLabStatus("FLIP COIN");
          setSessionThumbnails(prev => [objectUrl, ...prev]);
          setCapturedFrontPreview(objectUrl);
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else {
          if (!tempCapture) {
            toast({ variant: "destructive", title: "Sequence Error", description: "Missing front coin photo. Resetting." });
            setTempCapture(null);
            setCurrentSide('FRONT');
            setIsProcessing(false);
            return;
          }
          setCapturedBackPreview(objectUrl);
          const id = `coin_${Date.now()}`;
          const newUpload: PendingUpload = {
            id,
            frontBlob: tempCapture,
            backBlob: blob,
            status: 'PENDING',
            retries: 0,
            createdAt: Date.now()
          };

          await syncStorage.add(newUpload);
          setSyncQueue(prev => [...prev, newUpload]);
          setSessionThumbnails(prev => [objectUrl, ...prev]);

          setTempCapture(null);
          setCurrentSide('FRONT');
          setLabStatus("ANALYZING");
          
          // Switch UI to wait for AI
          setActiveUploadId(id);
          activeUploadRef.current = id;
          setBoothStep('SUBMITTING');
          setAiScanning(true);
          setCameraCollapsed(true);
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.75);

    } catch (e) {
      console.error("Capture Error", e);
      setLabStatus("ERROR");
      setTimeout(() => setLabStatus("READY"), 2000);
      setIsProcessing(false);
    }
  };

  const purgeQueue = async () => {
    for (const item of syncQueue) {
      await syncStorage.remove(item.id);
    }
    setSyncQueue([]);
    setSyncStatuses(new Map());
    toast({ title: "Queue Cleared", description: "Stuck uploads have been removed." });
  };

  const analyzeImageInBackground = async (imageData: ImageData, canvas: HTMLCanvasElement) => {
    return new Promise<QualityMetrics>((resolve) => {
      setTimeout(() => {
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.putImageData(imageData, 0, 0);
            const quality = analyzeImageQuality(tempCanvas, { minBlur: 15, minBrightness: 50 });
            resolve(quality);
          }
        } catch (err) {
          console.warn('Background analysis failed:', err);
        }
      }, 0);
    });
  };

  // ─── Manual AI Re-Check ─────────────────────────────────────────────
  const handleAiCheck = async () => {
    if (!reviewData?.frontUrl) {
      toast({ title: "No Image", description: "Front image URL not available for AI scan." });
      return;
    }
    setAiScanning(true);
    try {
      const { deepScanCoin } = await import('@/ai/flows/deep-scan-coin');
      const aiResult = await deepScanCoin(reviewData.frontUrl, reviewData.backUrl || undefined);
      
      setReviewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          coinName: aiResult.coinName || prev.coinName,
          setName: aiResult.setName || prev.setName,
          denomination: aiResult.denomination || prev.denomination,
          country: aiResult.country || prev.country,
          year: aiResult.year || prev.year,
          mintMark: aiResult.mintMark || prev.mintMark,
          composition: aiResult.composition || prev.composition,
          rarity: aiResult.rarity || prev.rarity,
          isRare: aiResult.isRare !== undefined ? aiResult.isRare : prev.isRare,
          description: aiResult.description || prev.description,
          price: aiResult.price || prev.price,
          condition: aiResult.condition || prev.condition,
          subCategory: aiResult.subCategory || prev.subCategory,
          brand: aiResult.brand || prev.brand,
          model: aiResult.model || prev.model,
          isMultiCoin: aiResult.isMultiCoin !== undefined ? aiResult.isMultiCoin : prev.isMultiCoin,
          coinCount: aiResult.coinCount || prev.coinCount,
          identificationSource: 'AI_DEEP_SCAN',
        };
      });
      toast({ title: "AI Check Complete", description: "Successfully extracted additional coin details." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message || "Could not analyze the coin image." });
    } finally {
      setAiScanning(false);
    }
  };

  // ─── Submit to Bench (promote to products) ──────────────────────
  const handleSubmitToBench = async () => {
    if (!reviewData) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to list coins." });
      return;
    }
    setSaving(true);
    try {
      // 1. Promote to products database
      await addDoc(collection(db, "products"), {
        title: reviewData.coinName || 'Collectible Coin',
        price: reviewData.price || 0,
        description: reviewData.description || '',
        imageUrls: [reviewData.frontUrl, reviewData.backUrl].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'Coins',
        brand: reviewData.brand || 'Royal Australian Mint',
        model: reviewData.model || reviewData.denomination || '',
        condition: reviewData.condition || reviewData.composition || 'New',
        year: reviewData.year || null,
        subCategory: reviewData.subCategory || 'Australian Coins',
        quantity: reviewData.coinCount || 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          coinName: reviewData.coinName,
          setName: reviewData.setName,
          denomination: reviewData.denomination,
          country: reviewData.country,
          year: reviewData.year,
          mintMark: reviewData.mintMark,
          composition: reviewData.composition,
          rarity: reviewData.rarity,
          isRare: reviewData.isRare,
          brand: reviewData.brand,
          model: reviewData.model,
          subCategory: reviewData.subCategory,
          condition: reviewData.condition,
          isMultiCoin: reviewData.isMultiCoin,
          coinCount: reviewData.coinCount,
        }
      });

      // 2. Mark import queue status as VERIFIED
      await updateDoc(doc(db, "coin_imports", reviewData.docId), {
        status: 'VERIFIED',
        coinName: reviewData.coinName,
        setName: reviewData.setName,
        denomination: reviewData.denomination,
        country: reviewData.country,
        year: reviewData.year,
        mintMark: reviewData.mintMark,
        composition: reviewData.composition,
        rarity: reviewData.rarity,
        isRare: reviewData.isRare,
        price: reviewData.price,
        description: reviewData.description,
        condition: reviewData.condition,
        subCategory: reviewData.subCategory,
        brand: reviewData.brand,
        model: reviewData.model,
        isMultiCoin: reviewData.isMultiCoin,
        coinCount: reviewData.coinCount,
        updatedAt: Date.now()
      });

      audioSynth.playChime();
      toast({ title: "✓ Submitted to Bench", description: "Coin is now live on the marketplace!" });
      
      // Reset for next coin
      resetBooth();
    } catch (err: any) {
      console.error("Submit failed", err);
      toast({ variant: "destructive", title: "Submit Failed", description: err.message || "Failed to list product." });
    } finally {
      setSaving(false);
    }
  };

  // ─── Skip & Queue for later review ──────────────────────────────
  const handleSkipAndQueue = () => {
    toast({ title: "Queued for Review", description: "Coin saved to the review queue. You can edit it later." });
    resetBooth();
  };

  // ─── Reset booth back to capture mode ───────────────────────────
  const resetBooth = () => {
    setBoothStep('CAPTURE');
    setReviewData(null);
    setActiveUploadId(null);
    activeUploadRef.current = null;
    setCapturedFrontPreview(null);
    setCapturedBackPreview(null);
    setCameraCollapsed(false);
    setAiScanning(false);
    setLabStatus("READY");
    setCurrentSide('FRONT');
  };

  const getDeviceTips = (device: DeviceProfile) => {
    if (device.manufacturer === 'samsung') {
      return "For best results, tap to focus and hold steady to combat over-sharpening.";
    }
    if (device.manufacturer === 'google') {
      return "Pixel Macro Mode is active. Move closer for pristine close-up clarity!";
    }
    if (device.manufacturer === 'apple') {
      return "iPhone selected. Ensure good lighting for the best text recognition.";
    }
    return "Ensure the coin is centered and well-lit.";
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/30">
      
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 p-4 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                Coincam <Badge variant="secondary" className="bg-white/10 text-[10px] px-1 py-0 h-4">PRO</Badge>
              </h1>
              <p className="text-xs text-white/50">{deviceProfile.name} • {deviceProfile.aiAcceleration.toUpperCase()} AI</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Status Tracker */}
            <div className="hidden sm:block">
              {Array.from(syncStatuses.values()).map(status => (
                <SyncStatusTracker key={status.id} status={status} />
              ))}
            </div>

            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="bg-zinc-950 border-white/10 rounded-t-3xl max-h-[85vh] overflow-y-auto">
                <SettingsSheet 
                  isOpen={settingsOpen}
                  setIsOpen={setSettingsOpen}
                  errorLog={errorLog}
                  selectedDevice={selectedDevice}
                  setSelectedDevice={setSelectedDevice}
                  showHUD={showHUD}
                  setShowHUD={setShowHUD}
                  hudPosition={hudPosition}
                  setHudPosition={setHudPosition}
                  brightnessThreshold={brightnessThreshold}
                  setBrightnessThreshold={setBrightnessThreshold}
                  focusThreshold={focusThreshold}
                  setFocusThreshold={setFocusThreshold}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto relative pb-32">

        {/* ─── CAMERA VIEW ────────────────────────────────────────────── */}
        <div className={cn(
          "transition-all duration-500 ease-in-out origin-top",
          cameraCollapsed ? "h-[120px] overflow-hidden rounded-b-3xl opacity-50 scale-[0.98]" : "h-[800px]",
          boothStep === 'CAPTURE' && "relative"
        )}>
          {/* Viewfinder Container */}
          <div className="relative w-full h-full bg-zinc-900 overflow-hidden flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: 'scale(1.01)' }} // Prevent edge bleeding
            />

            {/* Overlays / HUD (Only show when fully expanded) */}
            {!cameraCollapsed && showHUD && (
              <>
                {/* Guidelines */}
                <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-[100%] pointer-events-none transition-all duration-300" />
                <div className="absolute inset-1/4 border border-white/20 rounded-full pointer-events-none" />

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
                  <div className="w-full h-full border border-white/50 rounded-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 bg-white rounded-full" />
                </div>

                {/* Status Badges */}
                <div className="absolute top-6 inset-x-0 flex justify-center gap-2 pointer-events-none z-20">
                  <Badge variant="secondary" className={cn(
                    "bg-black/50 backdrop-blur-md text-white border-none text-xs tracking-wider transition-colors",
                    currentSide === 'BACK' && "bg-blue-500/80"
                  )}>
                    {currentSide === 'FRONT' ? '1. CAPTURE FRONT' : '2. CAPTURE BACK'}
                  </Badge>
                  {isProcessing && (
                    <Badge className="bg-yellow-500/80 backdrop-blur-md text-white border-none shadow-lg animate-pulse">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" /> {labStatus}
                    </Badge>
                  )}
                  {focusState === 'focusing' && (
                    <Badge className="bg-blue-500/80 backdrop-blur-md text-white border-none">Focusing...</Badge>
                  )}
                </div>

                {/* Advanced HUD */}
                <div className={cn(
                  "absolute z-20 transition-all duration-300 backdrop-blur-md bg-black/40 p-3 rounded-2xl border border-white/10 flex flex-col gap-3",
                  hudPosition === 'top-left' && "top-6 left-4",
                  hudPosition === 'top-right' && "top-6 right-4",
                  hudPosition === 'bottom-left' && "bottom-24 left-4",
                  hudPosition === 'bottom-right' && "bottom-24 right-4",
                  isHudCollapsed && "w-10 h-10 p-0 overflow-hidden items-center justify-center cursor-pointer"
                )}
                onClick={() => isHudCollapsed && setIsHudCollapsed(false)}
                >
                  {isHudCollapsed ? (
                    <Gauge className="w-5 h-5 text-white/70" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Telemetry</span>
                        <Button variant="ghost" size="icon" className="w-6 h-6 rounded-full hover:bg-white/10" onClick={(e) => { e.stopPropagation(); setIsHudCollapsed(true); }}>
                          <ArrowLeft className="w-3 h-3 rotate-45 text-white/50" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-white/50 flex items-center gap-1"><Sun className="w-3 h-3"/> LUX</span>
                          <span className={cn(
                            "text-sm font-medium font-mono",
                            !lastQuality ? "text-white/30" : 
                            lastQuality.brightnessScore > brightnessThreshold && lastQuality.brightnessScore < 85 ? "text-green-400" : "text-red-400"
                          )}>
                            {lastQuality ? lastQuality.brightnessScore.toFixed(0) : '--'}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-white/50 flex items-center gap-1"><Target className="w-3 h-3"/> FOCUS</span>
                          <span className={cn(
                            "text-sm font-medium font-mono",
                            !lastQuality ? "text-white/30" : 
                            lastQuality.blurScore > focusThreshold ? "text-green-400" : "text-red-400"
                          )}>
                            {lastQuality ? lastQuality.blurScore.toFixed(0) : '--'}
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden mt-1">
                        <div 
                          className={cn("h-full transition-all duration-300", 
                            !lastQuality ? "bg-white/30 w-0" : 
                            lastQuality.isAcceptable ? "bg-green-500" : "bg-red-500"
                          )} 
                          style={{ width: lastQuality ? '100%' : '0%' }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </>
            )}

            {/* Flash Effect */}
            <div className={cn(
              "absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-50",
              isProcessing ? "opacity-100" : "opacity-0"
            )} />
          </div>

          {/* Camera Controls (Hidden when collapsed) */}
          {!cameraCollapsed && (
            <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center justify-end bg-gradient-to-t from-black via-black/80 to-transparent">
              {/* Tip Text */}
              <p className="text-center text-xs text-white/60 mb-6 max-w-[280px] drop-shadow-md">
                {getDeviceTips(deviceProfile)}
              </p>

              <div className="flex items-center justify-between w-full max-w-[320px]">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className={cn(
                    "w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md transition-colors",
                    torchActive && "bg-white text-black hover:bg-white/90"
                  )}
                  onClick={toggleTorch}
                >
                  {torchActive ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
                </Button>
                
                <Button 
                  size="icon"
                  disabled={isProcessing}
                  onClick={capture}
                  className={cn(
                    "w-20 h-20 rounded-full border-4 transition-all duration-200 shadow-2xl relative group",
                    currentSide === 'BACK' ? "border-blue-500 bg-white hover:bg-gray-100" : "border-white bg-white/20 hover:bg-white/30 backdrop-blur-sm",
                    isProcessing && "scale-95 opacity-50 border-white/50"
                  )}
                >
                  <div className={cn(
                    "absolute inset-2 rounded-full transition-all duration-200",
                    currentSide === 'BACK' ? "bg-blue-500" : "bg-white group-hover:scale-95"
                  )} />
                </Button>

                <div className="w-12 h-12 relative flex items-center justify-center">
                  {syncQueue.length > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center rounded-full border-2 border-black animate-pulse z-10">
                      {syncQueue.length}
                    </Badge>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-12 h-12 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-md overflow-hidden relative"
                    onClick={() => router.push('/coincam/review')}
                  >
                    {sessionThumbnails.length > 0 ? (
                      <img src={sessionThumbnails[0]} alt="Latest" className="w-full h-full object-cover opacity-70" />
                    ) : (
                      <Layers className="w-5 h-5 text-white/70" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {/* Expand Camera Button (Only visible when collapsed) */}
          {cameraCollapsed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm hover:bg-black/20 transition-colors cursor-pointer" onClick={resetBooth}>
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-white/80" />
                <span className="text-sm font-medium text-white/80 tracking-wide">Tap to Resume Camera</span>
              </div>
            </div>
          )}
        </div>

        {/* ─── REVIEW & EDIT VIEW ────────────────────────────────────────── */}
        {boothStep !== 'CAPTURE' && (
          <div ref={reviewPanelRef} className="p-4 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            
            {aiScanning ? (
              <Card className="bg-zinc-900 border-white/10 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                <CardContent className="p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-blue-500 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Gem className="w-8 h-8 text-blue-400 animate-pulse" />
                    </div>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold tracking-tight">AI Analysis in Progress</h3>
                    <p className="text-white/60">Scanning coin details and assessing value...</p>
                  </div>
                  
                  {/* Thumbnails preview while scanning */}
                  <div className="flex gap-4 mt-4">
                    {capturedFrontPreview && (
                      <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden">
                        <img src={capturedFrontPreview} className="w-full h-full object-cover opacity-70" />
                      </div>
                    )}
                    {capturedBackPreview && (
                      <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden">
                        <img src={capturedBackPreview} className="w-full h-full object-cover opacity-70" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : reviewData && (
              <div className="space-y-6">
                
                {/* Status Bar */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Badge className={cn("bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1.5")}>
                      <BadgeCheck className="w-3 h-3" />
                      AI Scan Complete
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleAiCheck} disabled={aiScanning} className="h-8 text-xs text-white/50 hover:text-white">
                    <RefreshCw className={cn("w-3 h-3 mr-2", aiScanning && "animate-spin")} />
                    Re-Scan
                  </Button>
                </div>

                {/* Form Fields */}
                <Card className="bg-zinc-900 border-white/10 shadow-2xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-lg">Coin Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-white/70">Coin Name / Theme</Label>
                        <Input 
                          value={reviewData.coinName} 
                          onChange={e => setReviewData({...reviewData, coinName: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-white/70">Set Name</Label>
                        <Input 
                          value={reviewData.setName} 
                          onChange={e => setReviewData({...reviewData, setName: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                          placeholder="e.g. Lunar Series"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/70">Denomination</Label>
                        <Input 
                          value={reviewData.denomination} 
                          onChange={e => setReviewData({...reviewData, denomination: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                          placeholder="e.g. $1"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-white/70">Year</Label>
                        <Input 
                          type="number"
                          value={reviewData.year || ''} 
                          onChange={e => setReviewData({...reviewData, year: parseInt(e.target.value) || undefined})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-white/70">Mint Mark</Label>
                        <Input 
                          value={reviewData.mintMark} 
                          onChange={e => setReviewData({...reviewData, mintMark: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/70">Condition</Label>
                        <Input 
                          value={reviewData.condition} 
                          onChange={e => setReviewData({...reviewData, condition: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/70">Price (AUD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                          <Input 
                            type="number"
                            value={reviewData.price || ''} 
                            onChange={e => setReviewData({...reviewData, price: parseInt(e.target.value) || undefined})} 
                            className="bg-black/50 border-white/10 pl-7 focus-visible:ring-blue-500 font-bold text-green-400"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      
                      <div className="col-span-2 space-y-1.5">
                        <Label className="text-white/70">Description</Label>
                        <textarea 
                          value={reviewData.description} 
                          onChange={e => setReviewData({...reviewData, description: e.target.value})} 
                          className="w-full h-24 bg-black/50 border border-white/10 rounded-md p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 resize-none"
                        />
                      </div>

                    </div>
                  </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="flex-1 h-14 bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:text-white"
                    onClick={handleSkipAndQueue}
                  >
                    <Layers className="w-5 h-5 mr-2" />
                    Skip & Queue
                  </Button>
                  <Button 
                    className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-500/20"
                    onClick={handleSubmitToBench}
                    disabled={saving}
                  >
                    {saving ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Send className="w-5 h-5 mr-2" />
                    )}
                    Submit to Bench
                  </Button>
                </div>

              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
