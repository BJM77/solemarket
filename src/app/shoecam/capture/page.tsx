"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Target, 
  Sun, 
  Gauge, 
  Loader2, 
  RefreshCw, 
  Layers, 
  Trash2, 
  Settings,
  Zap,
  ZapOff,
  BadgeCheck,
  Camera,
  Send,
  Gem,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/samcam/hooks/use-toast";
import { db, auth } from "@/samcam/lib/firebase";
import { syncStorage, PendingUpload } from "@/shoecam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { analyzeImageQuality, QualityMetrics } from "@/samcam/lib/image-processing";
import { detectDevice, getProfileForPreset, DeviceProfile } from "@/samcam/lib/device-detector";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker, SyncStatus } from "@/samcam/components/sync-status-tracker";
import { syncService, SyncResult } from "@/shoecam/lib/sync-service";
import { audioSynth } from "@/samcam/lib/audio-effects";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/shoecam/auth-provider";

// ─── Types ────────────────────────────────────────────────────────────
type BoothStep = 'CAPTURE' | 'REVIEW' | 'SUBMITTING';
type ShoeSide = 'FRONT45' | 'SIDE' | 'TOP' | 'LABEL';

interface ReviewData {
  docId: string;
  front45Url: string;
  sideUrl: string;
  topUrl: string;
  labelUrl: string;
  brand: string;
  model: string;
  styleCode: string;
  sizeUs: string;
  colorway: string;
  condition: string;
  price: number | undefined;
  description: string;
  subCategory: string;
  year: number | undefined;
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
export default function ShoePhotoBooth() {
  const [boothStep, setBoothStep] = useState<BoothStep>('CAPTURE');
  const [reviewData, setReviewData] = useState<ReviewData | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);
  const [cameraCollapsed, setCameraCollapsed] = useState(false);

  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
  const [lastQuality, setLastQuality] = useState<QualityMetrics | null>(null);
  const [currentSide, setCurrentSide] = useState<ShoeSide>('FRONT45');
  
  const [tempFront45, setTempFront45] = useState<Blob | null>(null);
  const [tempSide, setTempSide] = useState<Blob | null>(null);
  const [tempTop, setTempTop] = useState<Blob | null>(null);
  
  const [torchActive, setTorchActive] = useState(false);
  const [sessionThumbnails, setSessionThumbnails] = useState<string[]>([]);
  const [focusState, setFocusState] = useState<'idle' | 'focusing' | 'locked'>('idle');
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

  const [capturedImages, setCapturedImages] = useState<Record<string, string>>({});
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const activeUploadRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      createdUrlsRef.current.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { }
      });
    };
  }, []);
  
  const [selectedDevice, setSelectedDevice] = useState<string>('auto');
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>(detectDevice());
  const [showHUD, setShowHUD] = useState(true);
  const [hudPosition, setHudPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [isHudCollapsed, setIsHudCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brightnessThreshold, setBrightnessThreshold] = useState(50);
  const [focusThreshold, setFocusThreshold] = useState(50);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewPanelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const errorLog = useErrorLog();
  const { user } = useAuth();

  useEffect(() => {
    if (selectedDevice === 'auto') {
      setDeviceProfile(detectDevice());
    } else {
      setDeviceProfile(getProfileForPreset(selectedDevice));
    }
  }, [selectedDevice]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    const startCamera = async () => {
      try {
        const constraints = getCameraConstraints(deviceProfile);
        stream = await navigator.mediaDevices.getUserMedia({ video: constraints as any });
        if (videoRef.current) videoRef.current.srcObject = stream;
        if (stream) videoTrackRef.current = stream.getVideoTracks()[0];
      } catch (err: any) {
        toast({ variant: "destructive", title: "Camera Error", description: err.message });
      }
    };
    startCamera();
    syncStorage.getAll().then(setSyncQueue);
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      videoTrackRef.current = null;
    };
  }, [deviceProfile, toast]);

  const triggerVibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  };

  const toggleTorch = async () => {
    try {
      const track = videoTrackRef.current;
      if (!track) return;
      const capabilities = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};
      if (capabilities && (capabilities as any).torch) {
        const nextState = !torchActive;
        await track.applyConstraints({ advanced: [{ torch: nextState }] } as any);
        setTorchActive(nextState);
        audioSynth.playChime();
      }
    } catch (e) {
      console.error("Failed to toggle torch", e);
    }
  };

  useEffect(() => {
    let isQueueProcessing = false;
    const processQueue = async () => {
      if (isQueueProcessing || syncQueue.length === 0) return;
      const activeItem = syncQueue.find(i => i.status === 'PENDING' || i.status === 'ERROR');
      if (!activeItem) return;
      
      const existingStatus = syncService.getActiveSync(activeItem.id);
      if (existingStatus) {
        setSyncStatuses(prev => new Map(prev).set(activeItem.id, existingStatus));
        return;
      }

      isQueueProcessing = true;
      try {
        const result: SyncResult = await syncService.processUpload(
          activeItem, deviceProfile,
          (status) => setSyncStatuses(prev => new Map(prev).set(activeItem.id, status))
        );

        if (result.success) {
          audioSynth.playChime();
          setSyncQueue(prev => prev.filter(i => i.id !== activeItem.id));
          setTimeout(() => {
            setSyncStatuses(prev => { const next = new Map(prev); next.delete(activeItem.id); return next; });
          }, 6000);

          if (activeUploadRef.current === activeItem.id && result.aiResult) {
            const ai = result.aiResult;
            setReviewData({
              docId: result.docId || activeItem.id,
              front45Url: result.front45Url || '',
              sideUrl: result.sideUrl || '',
              topUrl: result.topUrl || '',
              labelUrl: result.labelUrl || '',
              brand: ai.brand || '',
              model: ai.model || '',
              styleCode: ai.styleCode || '',
              sizeUs: ai.sizeUs || '',
              colorway: ai.colorway || '',
              condition: ai.condition || 'Brand New',
              price: ai.price || undefined,
              description: ai.description || '',
              subCategory: ai.subCategory || 'Sneakers',
              year: ai.year || undefined,
            });
            setBoothStep('REVIEW');
            setAiScanning(false);
            setTimeout(() => reviewPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
          }
        } else {
          const updated = { ...activeItem, status: 'ERROR' as const, retries: activeItem.retries + 1 };
          await syncStorage.update(updated);
          setSyncQueue(prev => prev.map(i => i.id === activeItem.id ? updated : i));
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
      c.width = 1080; c.height = 1080;
      const ctx = c.getContext('2d', { alpha: false })!;
      
      const minDim = Math.min(v.videoWidth, v.videoHeight);
      const sx = (v.videoWidth - minDim) / 2;
      const sy = (v.videoHeight - minDim) / 2;
      ctx.drawImage(v, sx, sy, minDim, minDim, 0, 0, 1080, 1080);

      c.toBlob(async (blob) => {
        if (!blob) { setIsProcessing(false); setLabStatus("READY"); return; }
        audioSynth.playShutter();
        triggerVibrate(60);

        const objectUrl = URL.createObjectURL(blob);
        createdUrlsRef.current.push(objectUrl);
        setCapturedImages(prev => ({ ...prev, [currentSide]: objectUrl }));

        if (currentSide === 'FRONT45') {
          setTempFront45(blob);
          setCurrentSide('SIDE');
          setLabStatus("CAPTURE SIDE");
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else if (currentSide === 'SIDE') {
          setTempSide(blob);
          setCurrentSide('TOP');
          setLabStatus("CAPTURE TOP");
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else if (currentSide === 'TOP') {
          setTempTop(blob);
          setCurrentSide('LABEL');
          setLabStatus("CAPTURE BOX LABEL");
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else {
          if (!tempFront45 || !tempSide || !tempTop) {
            toast({ variant: "destructive", title: "Sequence Error", description: "Missing previous photos in sequence. Resetting." });
            setTempFront45(null);
            setTempSide(null);
            setTempTop(null);
            setCurrentSide('FRONT45');
            setIsProcessing(false);
            return;
          }
          const id = `shoe_${Date.now()}`;
          const newUpload: PendingUpload = {
            id,
            front45Blob: tempFront45,
            sideBlob: tempSide,
            topBlob: tempTop,
            labelBlob: blob,
            status: 'PENDING',
            retries: 0,
            createdAt: Date.now()
          };

          await syncStorage.add(newUpload);
          setSyncQueue(prev => [...prev, newUpload]);
          setSessionThumbnails(prev => [objectUrl, ...prev]);

          setTempFront45(null);
          setTempSide(null);
          setTempTop(null);
          setCurrentSide('FRONT45');
          setLabStatus("ANALYZING");
          
          setActiveUploadId(id);
          activeUploadRef.current = id;
          setBoothStep('SUBMITTING');
          setAiScanning(true);
          setCameraCollapsed(true);
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.85);
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

  const handleAiCheck = async () => {
    if (!reviewData?.labelUrl) {
      toast({ title: "No Label Image", description: "Label image URL not available for AI scan." });
      return;
    }
    setAiScanning(true);
    try {
      const { deepScanShoe } = await import('@/ai/flows/deep-scan-shoe');
      const aiResult = await deepScanShoe(reviewData.labelUrl);
      
      setReviewData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          brand: aiResult.brand || prev.brand,
          model: aiResult.model || prev.model,
          styleCode: aiResult.styleCode || prev.styleCode,
          sizeUs: aiResult.sizeUs || prev.sizeUs,
          colorway: aiResult.colorway || prev.colorway,
          condition: aiResult.condition || prev.condition,
          price: aiResult.price || prev.price,
          description: aiResult.description || prev.description,
          subCategory: aiResult.subCategory || prev.subCategory,
          year: aiResult.year || prev.year,
        };
      });
      toast({ title: "AI Check Complete", description: "Extracted additional sneaker details." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message });
    } finally {
      setAiScanning(false);
    }
  };

  const handleSubmitToBench = async () => {
    if (!reviewData) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to list shoes." });
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "products"), {
        title: `${reviewData.brand} ${reviewData.model} ${reviewData.colorway || ''}`.trim(),
        price: reviewData.price || 0,
        description: reviewData.description || '',
        imageUrls: [reviewData.front45Url, reviewData.sideUrl, reviewData.topUrl, reviewData.labelUrl].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'Sneakers',
        brand: reviewData.brand,
        model: reviewData.model,
        condition: reviewData.condition,
        year: reviewData.year || null,
        subCategory: reviewData.subCategory,
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          brand: reviewData.brand,
          model: reviewData.model,
          styleCode: reviewData.styleCode,
          sizeUs: reviewData.sizeUs,
          colorway: reviewData.colorway,
          condition: reviewData.condition,
        }
      });

      await updateDoc(doc(db, "shoe_imports", reviewData.docId), {
        status: 'VERIFIED',
        ...reviewData,
        updatedAt: Date.now()
      });

      audioSynth.playChime();
      toast({ title: "✓ Submitted to Bench", description: "Sneaker is now live on the marketplace!" });
      resetBooth();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submit Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAndQueue = () => {
    toast({ title: "Queued for Review", description: "Shoe saved to the review queue." });
    resetBooth();
  };

  const resetBooth = () => {
    setBoothStep('CAPTURE');
    setReviewData(null);
    setActiveUploadId(null);
    activeUploadRef.current = null;
    setCapturedImages({});
    setCameraCollapsed(false);
    setAiScanning(false);
    setLabStatus("READY");
    setCurrentSide('FRONT45');
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/30">
      <header className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 p-4 safe-top">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/home')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-lg flex items-center gap-2">
                Shoecam <Badge variant="secondary" className="bg-white/10 text-[10px] px-1 py-0 h-4">PRO</Badge>
              </h1>
              <p className="text-xs text-white/50">{deviceProfile.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
        <div className={cn(
          "transition-all duration-500 ease-in-out origin-top relative bg-zinc-900",
          cameraCollapsed ? "h-[120px] overflow-hidden rounded-b-3xl opacity-50 scale-[0.98]" : "h-[800px]",
        )}>
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          
          {!cameraCollapsed && showHUD && (
            <>
              {currentSide === 'FRONT45' && <div className="absolute inset-8 border border-white/30 rounded-2xl rotate-3 pointer-events-none" />}
              {currentSide === 'LABEL' && <div className="absolute inset-x-8 top-1/4 bottom-1/4 border-2 border-dashed border-white/50 rounded-xl pointer-events-none" />}
              
              <div className="absolute top-6 inset-x-0 flex justify-center gap-2 pointer-events-none z-20">
                <Badge className="bg-black/50 text-white">
                  {currentSide === 'FRONT45' ? '1. FRONT 45°' : currentSide === 'SIDE' ? '2. SIDE' : currentSide === 'TOP' ? '3. TOP' : '4. BOX LABEL'}
                </Badge>
                {isProcessing && <Badge className="bg-yellow-500/80 text-white"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> {labStatus}</Badge>}
              </div>
            </>
          )}

          {!cameraCollapsed && (
            <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center justify-end bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="flex items-center justify-between w-full max-w-[320px]">
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-full bg-white/5" onClick={toggleTorch}>
                  {torchActive ? <Zap className="w-5 h-5 text-yellow-400" /> : <ZapOff className="w-5 h-5" />}
                </Button>
                <Button size="icon" disabled={isProcessing} onClick={capture} className="w-20 h-20 rounded-full border-4 border-white bg-white/20">
                  <div className="absolute inset-2 bg-white rounded-full transition-transform active:scale-90" />
                </Button>
                <Button variant="ghost" size="icon" className="w-12 h-12 rounded-xl bg-white/5" onClick={() => router.push('/shoecam/review')}>
                  <Layers className="w-5 h-5 text-white/70" />
                </Button>
              </div>
            </div>
          )}

          {cameraCollapsed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer" onClick={resetBooth}>
              <div className="flex flex-col items-center gap-2">
                <Camera className="w-8 h-8 text-white/80" />
                <span className="text-sm">Tap to Resume Camera</span>
              </div>
            </div>
          )}
        </div>

        {boothStep !== 'CAPTURE' && (
          <div ref={reviewPanelRef} className="p-4 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {aiScanning ? (
              <Card className="bg-zinc-900 border-white/10 overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-[shimmer_2s_infinite]" />
                <CardContent className="p-8 flex flex-col items-center justify-center gap-6 min-h-[300px]">
                  <Gem className="w-8 h-8 text-blue-400 animate-pulse" />
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">AI Sneaker Check</h3>
                    <p className="text-white/60">Reading box label and confirming model...</p>
                  </div>
                  <div className="flex gap-2 mt-4">
                    {Object.values(capturedImages).map((src, i) => (
                      <img key={i} src={src} className="w-12 h-12 rounded-lg border border-white/10 object-cover" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : reviewData && (
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1.5"><BadgeCheck className="w-3 h-3" /> AI Scan Complete</Badge>
                  <Button variant="ghost" size="sm" onClick={handleAiCheck} disabled={aiScanning} className="h-8 text-xs text-white/50 hover:text-white">
                    <RefreshCw className={cn("w-3 h-3 mr-2", aiScanning && "animate-spin")} /> Re-Scan
                  </Button>
                </div>

                <Card className="bg-zinc-900 border-white/10 shadow-2xl">
                  <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="text-lg">Sneaker Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Brand</Label>
                        <Input value={reviewData.brand} onChange={e => setReviewData({...reviewData, brand: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Model</Label>
                        <Input value={reviewData.model} onChange={e => setReviewData({...reviewData, model: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Style Code / SKU</Label>
                        <Input value={reviewData.styleCode} onChange={e => setReviewData({...reviewData, styleCode: e.target.value})} className="bg-black/50 border-white/10 font-mono text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Size (US)</Label>
                        <Input value={reviewData.sizeUs} onChange={e => setReviewData({...reviewData, sizeUs: e.target.value})} className="bg-black/50 border-white/10 font-bold" />
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Colorway</Label>
                        <Input value={reviewData.colorway} onChange={e => setReviewData({...reviewData, colorway: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Condition</Label>
                        <Input value={reviewData.condition} onChange={e => setReviewData({...reviewData, condition: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Price (AUD)</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                          <Input type="number" value={reviewData.price || ''} onChange={e => setReviewData({...reviewData, price: parseInt(e.target.value) || undefined})} className="bg-black/50 border-white/10 pl-7 text-green-400 font-bold" />
                        </div>
                      </div>
                      <div className="col-span-2 space-y-1.5">
                        <Label>Description</Label>
                        <textarea value={reviewData.description} onChange={e => setReviewData({...reviewData, description: e.target.value})} className="w-full h-24 bg-black/50 border border-white/10 rounded-md p-3 text-sm resize-none" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-14 bg-zinc-900 border-white/10" onClick={handleSkipAndQueue}>
                    <Layers className="w-5 h-5 mr-2" /> Queue
                  </Button>
                  <Button className="flex-1 h-14 bg-blue-600 text-white" onClick={handleSubmitToBench} disabled={saving}>
                    {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />} Submit to Bench
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
