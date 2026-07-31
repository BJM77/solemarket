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
import { syncStorage, PendingUpload } from "@/samcam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { analyzeImageQuality, QualityMetrics } from "@/samcam/lib/image-processing";
import { detectDevice, getProfileForPreset, DeviceProfile } from "@/samcam/lib/device-detector";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker, SyncStatus } from "@/samcam/components/sync-status-tracker";
import { syncService, SyncResult } from "@/samcam/lib/sync-service";
import { audioSynth } from "@/samcam/lib/audio-effects";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/samcam/auth-provider";

// ─── Types ────────────────────────────────────────────────────────────
type BoothStep = 'CAPTURE' | 'REVIEW' | 'SUBMITTING';

interface ReviewData {
  docId: string;
  frontUrl: string;
  backUrl: string;
  cardName: string;
  setName: string;
  cardNumber: string;
  sport: string;
  year: number | undefined;
  pokemonCode: string;
  rarity: string;
  isRare: boolean;
  description: string;
  condition: string;
  price: number | undefined;
  manufacturer: string;
  subCategory: string;
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
export default function BenchedPhotoBooth() {
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
    const urls = createdUrlsRef.current;
    return () => {
      urls.forEach(url => {
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

          // If this is the card we're actively watching, populate review form
          if (activeUploadRef.current === activeItem.id && result.aiResult) {
            const ai = result.aiResult;
            setReviewData({
              docId: result.docId || activeItem.id,
              frontUrl: result.frontUrl || '',
              backUrl: result.backUrl || '',
              cardName: ai.cardName || '',
              setName: ai.setName || '',
              cardNumber: ai.cardNumber || '',
              sport: ai.sport || 'Pokemon',
              year: ai.year || undefined,
              pokemonCode: ai.pokemonCode || '',
              rarity: ai.rarity || '',
              isRare: ai.isRare || false,
              description: ai.description || '',
              condition: ai.condition || 'Near Mint',
              price: ai.price || undefined,
              manufacturer: ai.manufacturer || 'Panini',
              subCategory: ai.subCategory || 'Sports Cards',
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
      c.height = 1120;
      const ctx = c.getContext('2d', { alpha: false })!;
      
      const xOffset = (v.videoWidth - 800) / 2;
      const yOffset = (v.videoHeight - 1120) / 2;
      ctx.drawImage(v, xOffset, yOffset, 800, 1120, 0, 0, 800, 1120);

      // Run image analysis in the background, non-blocking
      const imageData = ctx.getImageData(0, 0, 800, 1120);
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

        // Track captured thumbnail in the session feed list
        const objectUrl = URL.createObjectURL(blob);
        createdUrlsRef.current.push(objectUrl);

        if (currentSide === 'FRONT') {
          setTempCapture(blob);
          setCapturedFrontPreview(objectUrl);
          setCurrentSide('BACK');
          setLabStatus("FLIP CARD");
          setSessionThumbnails(prev => [objectUrl, ...prev]);
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else {
          const id = `card_${Date.now()}`;
          const newUpload: PendingUpload = {
            id,
            frontBlob: tempCapture!,
            backBlob: blob,
            status: 'PENDING',
            retries: 0,
            createdAt: Date.now()
          };

          await syncStorage.add(newUpload);
          setSyncQueue(prev => [...prev, newUpload]);
          setSessionThumbnails(prev => [objectUrl, ...prev]);
          setCapturedBackPreview(objectUrl);

          // Set this as the active upload we're watching for AI results
          setActiveUploadId(id);
          activeUploadRef.current = id;
          setAiScanning(true);
          setLabStatus("AI SCANNING...");
          setCameraCollapsed(true);

          // Initialize empty review data while we wait for AI
          setReviewData({
            docId: id,
            frontUrl: '',
            backUrl: '',
            cardName: '',
            setName: '',
            cardNumber: '',
            sport: 'Pokemon',
            year: undefined,
            pokemonCode: '',
            rarity: '',
            isRare: false,
            description: '',
            condition: 'Near Mint',
            price: undefined,
            manufacturer: 'Panini',
            subCategory: 'Sports Cards',
            identificationSource: 'AI_FALLBACK',
            identificationConfidence: 0,
          });

          setTempCapture(null);
          setCurrentSide('FRONT');
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
      const analyze = () => {
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) throw new Error('Could not get context');
          tempCtx.putImageData(imageData, 0, 0);
          
          const quality = analyzeImageQuality(tempCanvas, { minBlur: 15, minBrightness: 50 });
          resolve(quality);
        } catch (err) {
          console.warn('Background analysis failed:', err);
          resolve({
            blurScore: 20, brightnessScore: 120, glarePercentage: 5, contrastScore: 60, sharpnessScore: 70, colorTemperature: 6500, overallScore: 75, isAcceptable: true, messages: []
          });
        }
      };
      if ('requestIdleCallback' in window) {
        requestIdleCallback(analyze, { timeout: 2000 });
      } else {
        setTimeout(analyze, 100);
      }
    });
  };

  // ─── AI Re-Check (manual trigger from review panel) ─────────────
  const handleAiCheck = async () => {
    if (!reviewData?.frontUrl) {
      toast({ title: "No Image", description: "Front image URL not available for AI scan." });
      return;
    }
    setAiScanning(true);
    try {
      const { deepScanCard } = await import('@/ai/flows/deep-scan-card');
      // Send both front AND back to get maximum data extraction
      const aiResult = await deepScanCard(reviewData.frontUrl, reviewData.backUrl || undefined);
      
      setReviewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          cardName: aiResult.cardName || prev.cardName,
          setName: aiResult.setName || prev.setName,
          cardNumber: aiResult.cardNumber || prev.cardNumber,
          sport: aiResult.sport || prev.sport,
          year: aiResult.year || prev.year,
          pokemonCode: aiResult.pokemonCode || prev.pokemonCode,
          rarity: aiResult.rarity || prev.rarity,
          isRare: aiResult.isRare !== undefined ? aiResult.isRare : prev.isRare,
          description: aiResult.description || prev.description,
          manufacturer: aiResult.manufacturer || prev.manufacturer,
          subCategory: aiResult.subCategory || prev.subCategory,
          condition: aiResult.condition || prev.condition,
          identificationSource: 'AI_DEEP_SCAN',
        };
      });
      toast({ title: "AI Check Complete", description: "Successfully extracted additional card details." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message || "Could not analyze the card image." });
    } finally {
      setAiScanning(false);
    }
  };

  // ─── Submit to Bench (promote to products) ──────────────────────
  const handleSubmitToBench = async () => {
    if (!reviewData) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to list cards." });
      return;
    }
    setSaving(true);
    try {
      // 1. Promote to products
      await addDoc(collection(db, "products"), {
        title: reviewData.cardName || 'Trading Card',
        price: reviewData.price || 0,
        description: reviewData.description || '',
        imageUrls: [reviewData.frontUrl, reviewData.backUrl].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'Collector Cards',
        brand: reviewData.manufacturer || 'Panini',
        model: reviewData.setName || '',
        subCategory: reviewData.subCategory || 'Sports Cards',
        condition: reviewData.condition || 'Near Mint',
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          gradingCompany: '',
          grade: '',
          certNumber: '',
          cardNumber: reviewData.cardNumber || '',
          year: reviewData.year || '',
          setName: reviewData.setName || '',
          pokemonCode: reviewData.pokemonCode || '',
          isRare: reviewData.isRare || false,
          rarity: reviewData.rarity || '',
          brand: reviewData.manufacturer || 'Panini',
          subCategory: reviewData.subCategory || 'Sports Cards',
        }
      });

      // 2. Mark import as VERIFIED
      await updateDoc(doc(db, "card_imports", reviewData.docId), {
        status: 'VERIFIED',
        cardName: reviewData.cardName,
        setName: reviewData.setName,
        cardNumber: reviewData.cardNumber,
        sport: reviewData.sport,
        year: reviewData.year,
        condition: reviewData.condition,
        price: reviewData.price,
        description: reviewData.description,
        pokemonCode: reviewData.pokemonCode,
        rarity: reviewData.rarity,
        isRare: reviewData.isRare,
        updatedAt: Date.now()
      });

      audioSynth.playChime();
      toast({ title: "✓ Submitted to Bench", description: "Card is now live on the marketplace!" });
      
      // Reset for next card
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
    toast({ title: "Queued for Review", description: "Card saved to the review queue. You can edit it later." });
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
      return "Pristine iOS Capture active. Adjust angle slightly to reduce specular glare.";
    }
    return "Keep card flat, centered, and aligned with grid lines.";
  };

  const QualityAlerts = ({ quality }: { quality: QualityMetrics }) => {
    const alerts = [];
    if (quality.brightnessScore < 50) {
      alerts.push({ icon: <Sun className="w-3.5 h-3.5" />, text: "Too Dark", color: "text-yellow-400 border-yellow-400/20" });
    }
    if (quality.blurScore < 10) {
      alerts.push({ icon: <Gauge className="w-3.5 h-3.5" />, text: "Blurry Focus", color: "text-red-400 border-red-400/20" });
    }
    if (quality.glarePercentage > 15) {
      alerts.push({ icon: <Target className="w-3.5 h-3.5" />, text: "Glare Detected", color: "text-red-500 border-red-500/20" });
    }

    if (alerts.length === 0) {
      return (
        <div className="absolute bottom-24 left-4 bg-emerald-500/20 border border-emerald-500/30 rounded-full px-4 py-1.5 backdrop-blur-md">
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Capture
          </span>
        </div>
      );
    }

    return (
      <div className="absolute bottom-24 left-4 flex flex-col gap-2">
        {alerts.map((alert, i) => (
          <div key={i} className={cn("bg-black/80 border rounded-full px-4 py-1.5 backdrop-blur-md flex items-center", alert.color)}>
            <span className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
              {alert.icon} {alert.text}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center z-20 sticky top-0">
        <Button variant="ghost" size="icon" onClick={() => router.push('/samcam')}><ArrowLeft className="w-5 h-5" /></Button>
        
        <div className="flex gap-2 items-center">
          {boothStep === 'CAPTURE' ? (
            <Badge className={cn("text-[9px] font-black uppercase tracking-widest", currentSide === 'FRONT' ? "bg-primary" : "bg-orange-500")}>
              {currentSide === 'FRONT' ? 'Capture Front' : 'Flip for Back'}
            </Badge>
          ) : (
            <Badge className="text-[9px] font-black uppercase tracking-widest bg-emerald-600">
              <BadgeCheck className="w-3 h-3 mr-1" /> Review & Submit
            </Badge>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 h-[32px] px-3 text-[10px] uppercase font-black tracking-widest gap-2 ml-2"
            onClick={() => router.push('/samcam/review')}
          >
            <ListChecks className="w-3.5 h-3.5" />
            Review Queue
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="sm:hidden bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 h-[32px] w-[32px] ml-2"
            onClick={() => router.push('/samcam/review')}
          >
            <ListChecks className="w-3.5 h-3.5" />
          </Button>
          
          {boothStep === 'CAPTURE' && (
            <>
              <button 
                onClick={() => setShowHUD(prev => !prev)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                title={showHUD ? "Hide HUD" : "Show HUD"}
              >
                {showHUD ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
              </button>

              <button 
                onClick={toggleTorch}
                className={cn(
                  "p-2 rounded-lg transition",
                  torchActive ? "bg-primary text-white shadow-glow" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                )}
                title={torchActive ? "Turn Flash Off" : "Turn Flash On"}
              >
                {torchActive ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
              </button>

              <button 
                onClick={() => setSettingsOpen(true)}
                className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
                title="Configure Presets"
              >
                <Settings className="w-4 h-4 text-zinc-400" />
              </button>
            </>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-all active:scale-95">
                <Flame className={cn("w-3.5 h-3.5", syncQueue.length > 0 ? "text-orange-400 animate-pulse" : "text-zinc-600")} />
                <span className="text-[10px] font-black">
                  {syncQueue.filter(i => i.status === 'PENDING').length} PENDING
                  {syncQueue.filter(i => i.status === 'ERROR').length > 0 && 
                    ` • ${syncQueue.filter(i => i.status === 'ERROR').length} ERRORS`
                  }
                </span>
              </button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 text-white border-zinc-800 font-mono w-full sm:w-[450px] overflow-y-auto">
              <SheetHeader className="flex flex-row justify-between items-center pr-10">
                <SheetTitle className="text-white uppercase font-black text-sm">System Monitor</SheetTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-[8px] font-black uppercase px-2 h-7 border-zinc-700"
                    onClick={() => {
                      const logs = Array.from(syncStatuses.values()).map(s => ({
                        id: s.id,
                        steps: s.steps.map(step => ({
                          label: step.label,
                          status: step.status,
                          detail: step.detail,
                          timestamp: step.timestamp,
                        })),
                        error: s.error,
                      }));
                      navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
                      toast({ title: "Logs Copied", description: "Diagnostics copied to clipboard." });
                    }}
                  >
                    <FileText className="w-3 h-3 mr-1" /> Export Logs
                  </Button>
                  <Button variant="destructive" size="sm" className="text-[8px] font-black uppercase px-2 h-7" onClick={purgeQueue}>
                    <Trash2 className="w-3 h-3 mr-1" /> Purge Queue
                  </Button>
                </div>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                {syncStatuses.size === 0 && syncQueue.length === 0 && (
                  <div className="text-center py-10 opacity-30">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-[10px] font-black uppercase">No Active Syncs</p>
                    <p className="text-[8px] text-zinc-500 mt-1">Capture front/back of a card to begin</p>
                  </div>
                )}
                
                {/* Active Sync Statuses with stepper UI */}
                {Array.from(syncStatuses.values()).map(status => (
                  <SyncStatusTracker 
                    key={status.id}
                    status={status}
                    onRetry={(id) => {
                      const item = syncQueue.find(i => i.id === id);
                      if (item) {
                        syncStorage.update({ ...item, status: 'PENDING', retries: 0 });
                        setSyncQueue(prev => prev.map(i => i.id === id ? { ...i, status: 'PENDING', retries: 0 } : i));
                      }
                    }}
                    onCancel={(id) => {
                      syncStorage.remove(id);
                      setSyncQueue(prev => prev.filter(i => i.id !== id));
                      setSyncStatuses(prev => {
                        const next = new Map(prev);
                        next.delete(id);
                        return next;
                      });
                    }}
                  />
                ))}

                {/* Queued items (pending processing) */}
                {syncQueue.filter(i => i.status === 'PENDING' && !syncStatuses.has(i.id)).map(item => (
                  <div key={item.id} className="bg-zinc-900 border border-white/5 rounded-xl p-4 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-zinc-500" />
                    <div>
                      <div className="font-bold text-xs text-white">Queued: {item.id}</div>
                      <div className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5">Waiting for sync pipeline...</div>
                    </div>
                  </div>
                ))}

                {/* Queued Error Items */}
                {syncQueue.filter(i => i.status === 'ERROR' && !syncStatuses.has(i.id)).map(item => (
                  <div key={item.id} className="bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div className="flex-grow">
                        <div className="font-bold text-xs text-red-400">Failed: {item.id}</div>
                        <div className="text-[10px] font-mono text-red-300 mt-1 break-all">{item.error || "Unknown upload error."}</div>
                        <div className="text-[8px] text-zinc-500 mt-1 uppercase font-black tracking-widest">
                          Retries: {item.retries} • Created: {new Date(item.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="text-[8px] font-black uppercase h-7 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      onClick={() => {
                        syncStorage.update({ ...item, status: 'PENDING' });
                        setSyncQueue(prev => prev.map(i => i.id === item.id ? { ...i, status: 'PENDING' } : i));
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Retry Upload
                    </Button>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* ─── Camera Section (collapsible in review mode) ───────── */}
      <div className={cn(
        "relative transition-all duration-500 ease-in-out overflow-hidden",
        boothStep === 'CAPTURE' ? "flex-grow" : cameraCollapsed ? "h-0" : "h-48"
      )}>
        {boothStep !== 'CAPTURE' && !cameraCollapsed && (
          <button 
            onClick={() => setCameraCollapsed(true)}
            className="absolute top-2 right-2 z-20 bg-black/60 backdrop-blur-sm rounded-full p-1.5 hover:bg-black/80 transition"
          >
            <ChevronUp className="w-4 h-4 text-white" />
          </button>
        )}
        
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-65 grayscale" />
        
        {boothStep === 'CAPTURE' && (
          <>
            {showHUD && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6 z-10">
                {focusState === 'focusing' && (
                  <div className="absolute inset-0 border-2 border-yellow-400/50 rounded-2xl animate-pulse">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-yellow-400 px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                      FOCUSING...
                    </div>
                  </div>
                )}
                {focusState === 'locked' && (
                  <div className="absolute inset-0 border-2 border-green-400/50 rounded-2xl animate-in fade-in duration-300">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-green-400 px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                      FOCUS LOCKED
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Advanced Quality HUD */}
            {showHUD && lastQuality && (
              <div 
                onClick={() => setIsHudCollapsed(!isHudCollapsed)}
                className={cn(
                  "absolute bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 text-[9px] z-10 transition-all duration-300 cursor-pointer hover:bg-black/80 shadow-2xl",
                  hudPosition === 'top-left' && "top-4 left-4",
                  hudPosition === 'top-right' && "top-4 right-4",
                  hudPosition === 'bottom-left' && "bottom-24 left-4",
                  hudPosition === 'bottom-right' && "bottom-24 right-4",
                  isHudCollapsed ? "w-20" : "w-48"
                )}>
                
                {isHudCollapsed ? (
                  <div className="flex flex-col items-center justify-center gap-1 opacity-80">
                    <Gauge className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-[10px] tracking-widest uppercase text-white/90">HUD</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Smartphone className="w-3 h-3 text-blue-400" /> Device</span>
                      <span className="font-black text-blue-400 truncate max-w-[100px]">{deviceProfile.name}</span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Gauge className="w-3 h-3 text-emerald-400" /> Focus</span>
                      <span className={cn("font-black", lastQuality.blurScore > 15 ? "text-green-400" : "text-red-400")}>
                        {lastQuality.blurScore}
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Sun className="w-3 h-3 text-yellow-500" /> Brightness</span>
                      <span className={cn(
                        "font-black",
                        lastQuality.brightnessScore > 180 || lastQuality.brightnessScore < 60 ? "text-red-400" : "text-green-400"
                      )}>
                        {lastQuality.brightnessScore} LUX
                      </span>
                    </div>
                    
                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Target className="w-3 h-3 text-red-400" /> Glare</span>
                      <span className={cn("font-black", lastQuality.glarePercentage < 15 ? "text-green-400" : "text-red-400")}>
                        {lastQuality.glarePercentage}%
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Contrast className="w-3 h-3 text-indigo-400" /> Contrast</span>
                      <span className={cn("font-black", lastQuality.contrastScore > 50 ? "text-green-400" : "text-yellow-400")}>
                        {lastQuality.contrastScore}%
                      </span>
                    </div>

                    <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Zap className="w-3 h-3 text-purple-400" /> Sharpness</span>
                      <span className={cn("font-black", lastQuality.sharpnessScore > 60 ? "text-green-400" : "text-yellow-400")}>
                        {lastQuality.sharpnessScore}%
                      </span>
                    </div>

                    <div className="flex justify-between pb-2 items-center">
                      <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Thermometer className="w-3 h-3 text-orange-400" /> Temp</span>
                      <span className="font-black text-white">{lastQuality.colorTemperature}K</span>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between mb-1 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                        <span>Quality Score</span>
                        <span className={cn(
                          lastQuality.overallScore > 80 ? "text-green-400" :
                          lastQuality.overallScore > 60 ? "text-yellow-400" : "text-red-400"
                        )}>
                          {lastQuality.overallScore}%
                        </span>
                      </div>
                      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-500",
                            lastQuality.overallScore > 80 ? "bg-green-500" :
                            lastQuality.overallScore > 60 ? "bg-yellow-500" : "bg-red-500"
                          )}
                          style={{ width: `${lastQuality.overallScore}%` }}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Quality Alerts */}
            {lastQuality && <QualityAlerts quality={lastQuality} />}

            {/* Session Thumbnail strip on the left */}
            {sessionThumbnails.length > 0 && (
              <div className="absolute left-4 top-24 bottom-32 w-14 overflow-y-auto flex flex-col gap-2.5 scrollbar-none z-10">
                {sessionThumbnails.map((url, i) => (
                  <div key={i} className="w-12 h-16 rounded-lg border border-white/20 bg-zinc-900 overflow-hidden relative shrink-0 shadow-md">
                    <img src={url} className="w-full h-full object-cover" alt="thumbnail" />
                  </div>
                ))}
              </div>
            )}

            {/* Camera Viewport Framing Overlay with AR Pulsing Glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "w-72 md:w-80 aspect-[2.5/3.5] border-2 rounded-2xl flex items-center justify-center relative transition-all duration-300 bg-white/[0.02]",
                !lastQuality && "border-dashed border-white/30",
                lastQuality && lastQuality.overallScore > 80 && "border-solid border-primary shadow-[0_0_25px_rgba(242,108,13,0.4)] animate-pulse",
                lastQuality && lastQuality.overallScore <= 80 && "border-solid border-yellow-500 shadow-[0_0_25px_rgba(234,179,8,0.25)]"
              )}>
                <div className="text-center px-4">
                   <Badge className="bg-zinc-900/90 px-6 py-2 uppercase tracking-[0.3em] font-black text-[10px] border border-white/10 mb-4">{labStatus}</Badge>
                   {currentSide === 'BACK' && <Layers className="w-12 h-12 mx-auto text-orange-500 animate-bounce" />}
                   
                   {/* Micro Tip Box */}
                   <div className="mt-4 p-2 bg-black/60 border border-white/5 rounded-lg text-[8px] font-bold uppercase tracking-wider text-zinc-400 flex gap-1.5 items-start text-left">
                     <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                     <span>{getDeviceTips(deviceProfile)}</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Quality Trend sparkline */}
            {showHUD && qualityHistory.length > 0 && (
              <div className="absolute bottom-32 right-4 bg-black/60 backdrop-blur-md p-2.5 rounded-xl border border-white/10 w-44">
                <div className="flex items-center justify-between mb-1 text-[7px] font-bold text-zinc-400 uppercase tracking-widest">
                  <span>Trend</span>
                  <span>{qualityHistory.length}/10 runs</span>
                </div>
                <div className="flex items-end h-8 gap-0.5 pt-1">
                  {qualityHistory.map((q, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "flex-1 rounded-sm transition-all duration-300",
                        q.overallScore > 80 ? "bg-green-500" :
                        q.overallScore > 60 ? "bg-yellow-500" : "bg-red-500"
                      )}
                      style={{ height: `${q.overallScore}%` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Capture Button */}
            <button 
              onClick={capture} 
              disabled={isProcessing} 
              className="absolute bottom-8 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-zinc-900 active:scale-90 shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all disabled:opacity-50"
            >
              {isProcessing ? <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" /> : <div className="w-8 h-8 rounded-full bg-zinc-900" />}
            </button>
          </>
        )}
      </div>

      {/* ─── Review & Edit Panel ───────────────────────────────── */}
      {boothStep !== 'CAPTURE' && (
        <div ref={reviewPanelRef} className="flex-grow bg-black overflow-y-auto">
          {/* Camera expand button when collapsed */}
          {cameraCollapsed && (
            <button 
              onClick={() => setCameraCollapsed(false)}
              className="w-full py-2 bg-zinc-900 border-b border-white/10 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-800 transition"
            >
              <Camera className="w-3.5 h-3.5" />
              Show Camera
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          )}

          {/* AI Scanning Indicator */}
          {aiScanning && (
            <div className="mx-4 mt-4 p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3 animate-pulse">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">AI Scanning Card...</p>
                <p className="text-[8px] text-zinc-400 mt-0.5">Analyzing image with Gemini for card identification</p>
              </div>
            </div>
          )}

          <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {/* ─── Image Previews ──────────────────────────────── */}
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2 mb-3">
                <Camera className="w-3.5 h-3.5" /> Captured Images
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="aspect-[2.5/3.5] relative bg-zinc-900 rounded-xl overflow-hidden border-2 border-white/10">
                  {capturedFrontPreview ? (
                    <img src={capturedFrontPreview} alt="Front" className="w-full h-full object-cover" />
                  ) : reviewData?.frontUrl ? (
                    <img src={reviewData.frontUrl} alt="Front" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-600">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white">Front</Badge>
                </div>
                <div className="aspect-[2.5/3.5] relative bg-zinc-900 rounded-xl overflow-hidden border-2 border-white/10">
                  {capturedBackPreview ? (
                    <img src={capturedBackPreview} alt="Back" className="w-full h-full object-cover" />
                  ) : reviewData?.backUrl ? (
                    <img src={reviewData.backUrl} alt="Back" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-zinc-600">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  )}
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white">Back</Badge>
                </div>
              </div>
            </div>

            {/* ─── Metadata Form ───────────────────────────────── */}
            {reviewData && (
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between w-full mb-3">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="w-3.5 h-3.5" /> Card Details
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleAiCheck} 
                    disabled={aiScanning || !reviewData.frontUrl}
                    className="h-7 text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
                  >
                    {aiScanning ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
                    AI Check
                  </Button>
                </h2>

                <Card className="bg-zinc-900 border-white/10 text-white shadow-none">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* ID Source indicator */}
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-white/5">
                        <div>
                          <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">ID Source</p>
                          <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                            <Gem className="w-3 h-3 text-primary" /> {reviewData.identificationSource} 
                          </p>
                        </div>
                        {reviewData.identificationConfidence > 0 && (
                          <div className="text-right">
                            <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Confidence</p>
                            <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none", reviewData.identificationConfidence > 0.9 ? "text-green-400 bg-green-950/20" : "text-yellow-400 bg-yellow-950/20")}>
                              {Math.round(reviewData.identificationConfidence * 100)}% Match
                            </Badge>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card / Player Name</Label>
                          <Input 
                            value={reviewData.cardName} 
                            onChange={e => setReviewData({...reviewData, cardName: e.target.value})}
                            className="font-bold bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                            placeholder="e.g. Charizard, LeBron James"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Set Name</Label>
                          <Input 
                            value={reviewData.setName} 
                            onChange={e => setReviewData({...reviewData, setName: e.target.value})}
                            className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Card # / Number</Label>
                          <Input 
                            value={reviewData.cardNumber} 
                            onChange={e => setReviewData({...reviewData, cardNumber: e.target.value})}
                            className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Category / Sport</Label>
                          <Select value={reviewData.sport} onValueChange={val => setReviewData({...reviewData, sport: val})}>
                            <SelectTrigger className="font-bold bg-zinc-950 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="Pokemon">Pokemon</SelectItem>
                              <SelectItem value="NBA">NBA</SelectItem>
                              <SelectItem value="NFL">NFL</SelectItem>
                              <SelectItem value="MLB">MLB</SelectItem>
                              <SelectItem value="Soccer">Soccer</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Year</Label>
                          <Input 
                            type="number" 
                            value={reviewData.year || ''} 
                            onChange={e => setReviewData({...reviewData, year: parseInt(e.target.value) || undefined})}
                            className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          />
                        </div>
                        {reviewData.sport === "Pokemon" && (
                          <>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Pokemon Code</Label>
                              <Input 
                                value={reviewData.pokemonCode} 
                                onChange={e => setReviewData({...reviewData, pokemonCode: e.target.value})}
                                className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                                placeholder="e.g. SV4a, 150/150"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rarity / Stars</Label>
                              <Input 
                                value={reviewData.rarity} 
                                onChange={e => setReviewData({...reviewData, rarity: e.target.value})}
                                className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                                placeholder="e.g. Rare, Secret Rare, **"
                              />
                            </div>
                          </>
                        )}
                        
                        <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-white/5 col-span-2">
                          <div className="space-y-0.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rare Designation</Label>
                            <p className="text-[8px] text-zinc-500 uppercase">Mark if this card is considered rare or a collector item</p>
                          </div>
                          <input 
                            type="checkbox" 
                            checked={reviewData.isRare}
                            onChange={e => setReviewData({...reviewData, isRare: e.target.checked})}
                            className="w-4 h-4 accent-primary rounded border-zinc-700 bg-zinc-950 focus:ring-primary"
                          />
                        </div>

                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Listing Description</Label>
                          <textarea
                            value={reviewData.description}
                            onChange={e => setReviewData({...reviewData, description: e.target.value})}
                            placeholder="Gemini is analyzing the card..."
                            className="w-full min-h-[70px] rounded-lg border border-white/10 bg-zinc-950 p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none text-white placeholder-zinc-600"
                          />
                        </div>
                      </div>

                      {/* Condition & Price */}
                      <div className="pt-4 border-t border-white/5">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Condition Estimate</Label>
                            <Select value={reviewData.condition} onValueChange={val => setReviewData({...reviewData, condition: val})}>
                              <SelectTrigger className="border-primary/20 bg-zinc-950 text-white font-black uppercase text-[10px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="Mint">Gem Mint (10)</SelectItem>
                                <SelectItem value="Near Mint">Near Mint (NM)</SelectItem>
                                <SelectItem value="Lightly Played">Lightly Played (LP)</SelectItem>
                                <SelectItem value="Moderately Played">Mod. Played (MP)</SelectItem>
                                <SelectItem value="Damaged">Damaged (DMG)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Est. Market Price ($)</Label>
                            <Input 
                              type="number" 
                              value={reviewData.price || ''} 
                              onChange={e => setReviewData({...reviewData, price: parseFloat(e.target.value) || undefined})}
                              className="font-black border-primary/20 bg-zinc-950 text-white focus:ring-primary" 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-6 space-y-3">
                        <Button 
                          className="w-full bg-primary text-black hover:bg-primary/90 font-black uppercase tracking-wider py-6 text-sm"
                          onClick={handleSubmitToBench}
                          disabled={saving || aiScanning}
                        >
                          {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                          Submit to Bench
                        </Button>

                        <Button 
                          variant="outline"
                          className="w-full border-white/10 text-zinc-300 hover:bg-zinc-800 font-black uppercase tracking-wider py-5 text-xs"
                          onClick={handleSkipAndQueue}
                          disabled={saving}
                        >
                          <SkipForward className="w-4 h-4 mr-2" />
                          Skip — Add to Review Queue
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}

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
      />
    </div>
  );
}
