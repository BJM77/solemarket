"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Target, 
  Sun, 
  Gauge, 
  CheckCircle2, 
  Loader2, 
  RefreshCw, 
  Trash2, 
  Eye, 
  EyeOff, 
  Settings,
  Zap,
  ZapOff,
  Clock,
  XCircle,
  FileText,
  ListChecks
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useToast } from "@/samcam/hooks/use-toast";
import { auth } from "@/samcam/lib/firebase";
import { syncStorage, PendingUpload } from "@/procam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { analyzeImageQuality, QualityMetrics } from "@/samcam/lib/image-processing";
import { detectDevice, getProfileForPreset, DeviceProfile } from "@/samcam/lib/device-detector";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker, SyncStatus } from "@/samcam/components/sync-status-tracker";
import { syncService } from "@/procam/lib/sync-service";
import { audioSynth } from "@/samcam/lib/audio-effects";

const getCameraConstraints = (device: DeviceProfile) => {
  const constraints: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: device.recommendedResolution.width },
    height: { ideal: device.recommendedResolution.height },
  };
  return constraints;
};

export default function ProPhotoBooth() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
  const [lastQuality, setLastQuality] = useState<QualityMetrics | null>(null);
  
  // 2 steps sequence
  const [currentStep, setCurrentStep] = useState<'MAIN' | 'SECONDARY'>('MAIN');
  const [tempMain, setTempMain] = useState<Blob | null>(null);
  
  const [torchActive, setTorchActive] = useState(false);
  const [sessionThumbnails, setSessionThumbnails] = useState<string[]>([]);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const errorLog = useErrorLog();

  useEffect(() => {
    if (selectedDevice === 'auto') {
      setDeviceProfile(detectDevice());
    } else {
      setDeviceProfile(getProfileForPreset(selectedDevice));
    }
  }, [selectedDevice]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function startCamera() {
      if (!videoRef.current) return;
      try {
        const constraints = getCameraConstraints(deviceProfile);
        const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        videoRef.current.srcObject = stream;
        activeStream = stream;
        const track = stream.getVideoTracks()[0];
        videoTrackRef.current = track;
      } catch (err: any) {
        console.error("Camera access failed:", err);
        errorLog.addError("BOOTH_CAMERA_INIT_FAILED: " + err.message);
        toast({
          variant: "destructive",
          title: "Camera Access Error",
          description: "Could not open camera stream. Please check permissions."
        });
      }
    }

    startCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [deviceProfile, toast, errorLog]);

  // Load existing Queue
  useEffect(() => {
    async function loadQueue() {
      const items = await syncStorage.getAll();
      setSyncQueue(items.sort((a, b) => b.createdAt - a.createdAt));
    }
    loadQueue();
  }, []);

  // Background Sync Runner Loop
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;
    
    async function runSyncs() {
      const pending = syncQueue.filter(q => q.status === 'PENDING' || q.status === 'ERROR');
      if (pending.length === 0) return;

      for (const item of pending) {
        // Mark status as uploading
        item.status = 'UPLOADING';
        await syncStorage.update(item);
        
        const success = await syncService.processUpload(
          item,
          deviceProfile,
          (status) => {
            setSyncStatuses(prev => {
              const next = new Map(prev);
              next.set(item.id, status);
              return next;
            });
          }
        );

        if (success) {
          setSyncQueue(prev => prev.filter(q => q.id !== item.id));
        } else {
          item.status = 'ERROR';
          item.retries += 1;
          await syncStorage.update(item);
          setSyncQueue(prev => prev.map(q => q.id === item.id ? { ...item } : q));
        }
      }
    }

    syncInterval = setInterval(runSyncs, 4000);
    return () => clearInterval(syncInterval);
  }, [syncQueue, deviceProfile]);

  const toggleTorch = async () => {
    if (!videoTrackRef.current) return;
    try {
      const capabilities = videoTrackRef.current.getCapabilities();
      // @ts-ignore
      if (capabilities.torch) {
        const nextState = !torchActive;
        // @ts-ignore
        await videoTrackRef.current.applyConstraints({ advanced: [{ torch: nextState }] });
        setTorchActive(nextState);
      } else {
        toast({ title: "Hardware Warning", description: "Flash/Torch control is not supported on this device's camera." });
      }
    } catch (e) {
      console.warn("Torch configuration failed", e);
    }
  };

  const triggerVibrate = (pattern: number | number[]) => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(pattern);
    }
  };

  const capturePhoto = async () => {
    if (isProcessing || !videoRef.current) return;
    setIsProcessing(true);
    setLabStatus("CHECKING...");

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const width = video.videoWidth;
      const height = video.videoHeight;
      
      const cropWidth = 1024;
      const cropHeight = 768;
      canvas.width = cropWidth;
      canvas.height = cropHeight;

      if (!ctx) throw new Error("Could not construct 2D context");

      // Draw landscape center crop
      const startX = (width - (height * (4/3))) / 2;
      const sourceWidth = height * (4/3);
      const sourceHeight = height;

      ctx.drawImage(
        video,
        startX, 0, sourceWidth, sourceHeight,
        0, 0, cropWidth, cropHeight
      );

      // Run image analysis for records, but do not block capture
      const q = analyzeImageQuality(canvas, undefined);
      setLastQuality(q);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setLabStatus("READY");
          return;
        }

        audioSynth.playShutter();
        triggerVibrate(60);

        const objectUrl = URL.createObjectURL(blob);
        createdUrlsRef.current.push(objectUrl);

        if (currentStep === 'MAIN') {
          setTempMain(blob);
          setCurrentStep('SECONDARY');
          setLabStatus("CAPTURE DETAIL");
          setSessionThumbnails(prev => [objectUrl, ...prev]);
          triggerVibrate([30, 50, 30]);
          setIsProcessing(false);
        } else {
          const id = `pro_${Date.now()}`;
          const newUpload: PendingUpload = {
            id,
            mainBlob: tempMain!,
            secondaryBlob: blob,
            status: 'PENDING',
            retries: 0,
            createdAt: Date.now()
          };

          await syncStorage.add(newUpload);
          setSyncQueue(prev => [...prev, newUpload]);
          setSessionThumbnails(prev => [objectUrl, ...prev]);

          setTempMain(null);
          setCurrentStep('MAIN');
          setLabStatus("READY");
          setIsProcessing(false);
        }
      }, 'image/jpeg', 0.8);

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

  const getStepGuide = (step: typeof currentStep) => {
    switch (step) {
      case 'MAIN':
        return "Main View: Align the entire product in the center frame.";
      case 'SECONDARY':
        return "Detail View: Take a close-up picture of any unique details, serial number, tag, or label.";
    }
  };

  return (
    <div className="h-screen bg-black text-white font-mono flex flex-col overflow-hidden">
      <header className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center z-20">
        <Button variant="ghost" size="icon" onClick={() => router.push('/procam')}><ArrowLeft className="w-5 h-5" /></Button>
        
        <div className="flex gap-2 items-center">
          <Badge className={cn("text-[9px] font-black uppercase tracking-widest", 
            currentStep === 'MAIN' ? "bg-primary text-black" : "bg-purple-600 text-white"
          )}>
            Step: {currentStep}
          </Badge>

          <Button 
            variant="outline" 
            size="sm" 
            className="hidden sm:flex bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 h-[32px] px-3 text-[10px] uppercase font-black tracking-widest gap-2 ml-2"
            onClick={() => router.push('/procam/review')}
          >
            <ListChecks className="w-3.5 h-3.5" />
            Review Queue
          </Button>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="sm:hidden bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700 h-[32px] w-[32px] ml-2"
            onClick={() => router.push('/procam/review')}
          >
            <ListChecks className="w-3.5 h-3.5" />
          </Button>
          
          <button onClick={() => setShowHUD(prev => !prev)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
            {showHUD ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
          </button>
          <button onClick={toggleTorch} className={cn("p-2 rounded-lg transition", torchActive ? "bg-primary text-white" : "bg-zinc-800 text-zinc-400")}>
            {torchActive ? <ZapOff className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          </button>
          <button onClick={() => setSettingsOpen(true)} className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition">
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </header>

      <div className="flex-1 relative flex items-center justify-center bg-zinc-950">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-65 grayscale" />

        {/* HUD Box Guidelines overlay */}
        {showHUD && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
            {currentStep === 'MAIN' && (
              <div className="w-[85%] max-w-[400px] aspect-[4/3] border-2 border-dashed border-primary/60 rounded-xl relative flex items-center justify-center">
                <span className="text-[9px] font-black text-primary bg-black/80 px-2 py-0.5 rounded uppercase tracking-wider">Align Product Center</span>
              </div>
            )}
            {currentStep === 'SECONDARY' && (
              <div className="w-48 h-48 border-2 border-dashed border-purple-500/60 rounded-lg relative flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400 animate-pulse" />
                <span className="absolute bottom-2 text-[8px] font-black text-purple-400 bg-black/80 px-1.5 py-0.5 rounded uppercase tracking-widest">Detail Close-Up</span>
              </div>
            )}
          </div>
        )}

        {/* Step Info Message */}
        <div className="absolute top-4 inset-x-4 bg-black/80 border border-white/10 rounded-lg p-2.5 backdrop-blur-sm pointer-events-none">
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Guide</p>
          <p className="text-xs font-semibold text-white mt-1 leading-relaxed">{getStepGuide(currentStep)}</p>
        </div>

        {/* Quality Alerts */}
        {lastQuality && (
          <div className="absolute bottom-24 left-4 flex flex-col gap-2">
            {lastQuality.brightnessScore < 50 && (
              <div className="bg-black/80 border border-yellow-400/20 rounded-full px-3 py-1 text-[9px] text-yellow-400 uppercase font-black flex items-center gap-1.5"><Sun className="w-3.5 h-3.5" /> Too Dark</div>
            )}
            {lastQuality.blurScore < 10 && (
              <div className="bg-black/80 border border-red-400/20 rounded-full px-3 py-1 text-[9px] text-red-400 uppercase font-black flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Blurry Focus</div>
            )}
          </div>
        )}
      </div>

      {/* Control Console */}
      <footer className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between z-20">
        {/* Sync Queues Modal */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex flex-col items-center justify-center text-zinc-400 hover:text-white transition relative">
              <Clock className="w-5 h-5" />
              <span className="text-[8px] font-bold uppercase mt-1">Queue</span>
              {syncQueue.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-black font-black text-[8px] rounded-full h-4 w-4 flex items-center justify-center">
                  {syncQueue.length}
                </span>
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[75vh] bg-zinc-950 border-t border-white/10 text-white font-mono p-4">
            <SheetHeader className="flex flex-row justify-between items-center border-b border-white/5 pb-4 mb-4">
              <div>
                <SheetTitle className="text-white font-black uppercase text-sm tracking-tight">Sync Pipeline ({syncQueue.length} Active)</SheetTitle>
              </div>
              <div className="flex gap-2">
                {syncQueue.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-red-400 text-[9px] font-black uppercase h-8 hover:bg-red-950/20" onClick={purgeQueue}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Purge
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="space-y-4 overflow-y-auto max-h-[50vh] pr-2 scrollbar-hide">
              {syncQueue.map((item) => {
                const active = syncStatuses.get(item.id);
                return (
                  <SyncStatusTracker key={item.id} status={active || {
                    id: item.id,
                    startedAt: new Date(item.createdAt).toISOString(),
                    currentStep: 0,
                    steps: []
                  }} />
                );
              })}
              {syncQueue.length === 0 && (
                <div className="py-24 text-center text-zinc-500 text-xs">No pending uploads in the database queue. Ready for captures.</div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Shutter Capture Button */}
        <div className="flex-1 flex justify-center">
          <button 
            onClick={capturePhoto} 
            disabled={isProcessing}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/10 active:scale-95 transition"
          >
            <div className={cn("w-12 h-12 rounded-full bg-primary flex items-center justify-center transition-all", isProcessing && "scale-75 opacity-50")}>
              {isProcessing && <Loader2 className="w-6 h-6 animate-spin text-black" />}
            </div>
          </button>
        </div>

        {/* Captured Batch count / preview thumbnail */}
        <div className="w-10 h-10 bg-zinc-950 border border-white/10 rounded-lg overflow-hidden flex items-center justify-center relative">
          {sessionThumbnails.length > 0 ? (
            <img src={sessionThumbnails[0]} className="w-full h-full object-cover" alt="thumbnail" />
          ) : (
            <FileText className="w-4 h-4 text-zinc-600" />
          )}
          {sessionThumbnails.length > 0 && (
            <span className="absolute bottom-0 right-0 bg-black/80 text-primary font-black text-[8px] px-1 rounded-tl">
              {sessionThumbnails.length}
            </span>
          )}
        </div>
      </footer>

      {/* SettingsPresets */}
      <SettingsSheet 
        isOpen={settingsOpen}
        setIsOpen={setSettingsOpen}
        errorLog={errorLog}
        selectedDevice={selectedDevice}
        setSelectedDevice={setSelectedDevice}
      />
    </div>
  );
}
