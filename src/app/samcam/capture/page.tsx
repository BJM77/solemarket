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
  AlertTriangle, 
  Trash2, 
  Smartphone, 
  Contrast, 
  Eye, 
  EyeOff, 
  Settings,
  Flame as GlareIcon, // Mapping Glare to Flame/Target
  Thermometer,
  Zap,
  Info
} from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Badge } from "@/samcam/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/samcam/components/ui/sheet";
import { Progress } from "@/samcam/components/ui/progress";
import { useToast } from "@/samcam/hooks/use-toast";
import { db, storage, auth } from "@/samcam/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { syncStorage, PendingUpload } from "@/samcam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { analyzeImageQuality, QualityMetrics } from "@/samcam/lib/image-processing";
import { detectDevice, getProfileForPreset, DeviceProfile } from "@/samcam/lib/device-detector";
import { logPerformance } from "@/samcam/lib/performance-monitor";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";

const INTERNAL_TOKEN = "benched_studio_v4_6_secure";

const getCameraConstraints = (device: DeviceProfile) => {
  const constraints: MediaTrackConstraints = {
    facingMode: 'environment',
    width: { ideal: device.recommendedResolution.width },
    height: { ideal: device.recommendedResolution.height },
  };

  // Samsung softening filter optimization
  if (device.manufacturer === 'samsung') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
        { 'com.samsung.android.camera.softening': 0.8 },
      ],
    };
  }

  // Google Pixel Tensor optimizations
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
      ],
    };
  }

  // Apple iOS focus optimizations
  if (device.manufacturer === 'apple') {
    return {
      ...constraints,
      // @ts-ignore
      advanced: [
        { focusMode: 'auto' },
        { exposureMode: 'auto' },
        { whiteBalanceMode: 'auto' },
      ],
    };
  }

  return constraints;
};

export default function BenchedPhotoBooth() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [lastQuality, setLastQuality] = useState<QualityMetrics | null>(null);
  const [currentSide, setCurrentSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [tempCapture, setTempCapture] = useState<Blob | null>(null);
  
  // Custom HUD and Profile States
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
  const [qualityHistory, setQualityHistory] = useState<QualityMetrics[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();
  const errorLog = useErrorLog();

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
      } catch (err: any) {
        console.error("Camera access failed", err);
        // Fallback to simpler constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
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
    };
  }, [deviceProfile, toast]);

  const capture = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);
    setLabStatus("LOCKING...");

    const startTime = performance.now();

    try {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      
      // Use profile-recommended target sizes
      const targetW = deviceProfile.recommendedAspectRatio === '4:3' ? 1440 : 1920;
      const targetH = 1080; // Baseline standard
      
      c.width = 800; 
      c.height = 1120;
      const ctx = c.getContext('2d', { alpha: false })!;
      
      const xOffset = (v.videoWidth - 800) / 2;
      const yOffset = (v.videoHeight - 1120) / 2;
      ctx.drawImage(v, xOffset, yOffset, 800, 1120, 0, 0, 800, 1120);

      const q = analyzeImageQuality(c);
      setLastQuality(q);
      setQualityHistory(prev => [...prev.slice(-9), q]); // Keep last 10 elements

      if (!q.isAcceptable) {
        setLabStatus(q.messages[0] || "ADJUST...");
        setTimeout(() => setLabStatus("READY"), 1500);
        setIsProcessing(false);
        return;
      }

      const captureTime = Math.round(performance.now() - startTime);
      const b64 = c.toDataURL('image/jpeg', 0.75);
      
      c.toBlob(async (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setLabStatus("READY");
          return;
        }

        if (currentSide === 'FRONT') {
          setTempCapture(blob);
          setCurrentSide('BACK');
          setLabStatus("FLIP CARD");
          if (navigator.vibrate) navigator.vibrate([30, 50, 30]);
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
          
          const uploadStart = performance.now();

          fetch('/samcam/api/identify', {
            method: 'POST',
            headers: { 'X-Benched-Token': INTERNAL_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: id, frontImage: b64, deviceProfile })
          }).then(r => r.json()).then(res => {
            const aiTime = Math.round(performance.now() - uploadStart);
            if (db) {
              updateDoc(doc(db, "card_imports", id), { ...res, status: 'VERIFIED' }).catch(console.error);
            }
            
            // Log Performance Metric
            logPerformance({
              deviceName: deviceProfile.name,
              captureTime,
              uploadTime: Math.round(performance.now() - uploadStart),
              aiProcessingTime: aiTime,
              totalTime: Math.round(performance.now() - startTime),
              fps: 30
            });
          }).catch(err => console.error("ID API Error", err));

          setTempCapture(null);
          setCurrentSide('FRONT');
          setLabStatus("READY");
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
    setUploadProgress({});
    toast({ title: "Queue Cleared", description: "Stuck uploads have been removed." });
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

  // Real-Time Quality Alert Pills
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

  return (
    <div className="h-screen bg-black text-white font-mono flex flex-col overflow-hidden">
      <header className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center z-20">
        <Button variant="ghost" size="icon" onClick={() => router.push('/samcam')}><ArrowLeft className="w-5 h-5" /></Button>
        
        <div className="flex gap-2 items-center">
          <Badge className={cn("text-[9px] font-black uppercase tracking-widest", currentSide === 'FRONT' ? "bg-primary" : "bg-orange-500")}>
            {currentSide === 'FRONT' ? 'Capture Front' : 'Flip for Back'}
          </Badge>
          
          <button 
            onClick={() => setShowHUD(prev => !prev)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
            title={showHUD ? "Hide HUD" : "Show HUD"}
          >
            {showHUD ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
          </button>

          <button 
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition"
            title="Configure Presets"
          >
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>

          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full hover:bg-zinc-700 transition-all active:scale-95">
                <Flame className={cn("w-3.5 h-3.5", syncQueue.length > 0 ? "text-orange-400 animate-pulse" : "text-zinc-600")} />
                <span className="text-[10px] font-black">{syncQueue.length} SYNCING</span>
              </button>
            </SheetTrigger>
            <SheetContent className="bg-zinc-950 text-white border-zinc-800 font-mono">
              <SheetHeader className="flex flex-row justify-between items-center pr-10">
                <SheetTitle className="text-white uppercase font-black text-sm">System Monitor</SheetTitle>
                <Button variant="destructive" size="sm" className="text-[8px] font-black uppercase px-2 h-7" onClick={purgeQueue}>
                  <Trash2 className="w-3 h-3 mr-1" /> Purge Stuck
                </Button>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                {syncQueue.length === 0 && (
                   <div className="text-center py-10 opacity-30">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-[10px] font-black uppercase">Sync Complete</p>
                   </div>
                )}
                {syncQueue.map(item => (
                  <div key={item.id} className="p-3 bg-zinc-900 border border-white/5 rounded-xl">
                    <div className="flex justify-between text-[8px] mb-2 text-zinc-500">
                      <span className="truncate max-w-[150px]">ID: {item.id}</span>
                      <span className={cn("font-black uppercase", item.status === 'ERROR' ? "text-red-400" : "text-blue-400")}>
                        {item.status === 'ERROR' ? "ERROR" : `${Math.round(uploadProgress[item.id] || 0)}%`}
                      </span>
                    </div>
                    {item.status === 'ERROR' && item.error && (
                      <p className="text-[7px] text-red-400 leading-tight mb-2 uppercase font-black">{item.error}</p>
                    )}
                    <Progress value={uploadProgress[item.id] || 0} className="h-1 bg-zinc-800" />
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center relative">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-65 grayscale" />
        
        {/* Advanced Quality HUD */}
        {showHUD && lastQuality && (
          <div className={cn(
            "absolute bg-black/70 backdrop-blur-md p-4 rounded-xl border border-white/10 text-[9px] w-48 z-10 transition-all duration-300",
            hudPosition === 'top-left' && "top-4 left-4",
            hudPosition === 'top-right' && "top-4 right-4",
            hudPosition === 'bottom-left' && "bottom-24 left-4",
            hudPosition === 'bottom-right' && "bottom-24 right-4",
          )}>
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Smartphone className="w-3 h-3 text-blue-400" /> Device</span>
              <span className="font-black text-blue-400 truncate max-w-[100px]">{deviceProfile.name}</span>
            </div>
            
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Gauge className="w-3 h-3 text-emerald-400" /> Focus</span>
              <span className={cn("font-black", lastQuality.blurScore > 15 ? "text-green-400" : "text-red-400")}>
                {lastQuality.blurScore}
              </span>
            </div>
            
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Sun className="w-3 h-3 text-yellow-500" /> Brightness</span>
              <span className={cn(
                "font-black",
                lastQuality.brightnessScore > 180 || lastQuality.brightnessScore < 60 ? "text-red-400" : "text-green-400"
              )}>
                {lastQuality.brightnessScore} LUX
              </span>
            </div>
            
            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
              <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Target className="w-3 h-3 text-red-400" /> Glare</span>
              <span className={cn("font-black", lastQuality.glarePercentage < 15 ? "text-green-400" : "text-red-400")}>
                {lastQuality.glarePercentage}%
              </span>
            </div>

            <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
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

            <div className="flex justify-between pb-2">
              <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Thermometer className="w-3 h-3 text-orange-400" /> Temp</span>
              <span className="font-black text-white">{lastQuality.colorTemperature}K</span>
            </div>

            {/* Overall Rating Indicator */}
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
          </div>
        )}

        {/* Quality Alerts */}
        {lastQuality && <QualityAlerts quality={lastQuality} />}

        {/* Camera Viewport Framing Overlay */}
        <div className="w-72 md:w-80 aspect-[2.5/3.5] border-2 border-dashed border-white/30 rounded-2xl flex items-center justify-center bg-white/5 relative">
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

        <button 
          onClick={capture} 
          disabled={isProcessing} 
          className="absolute bottom-8 w-20 h-20 bg-white rounded-full border-8 border-zinc-900 active:scale-90 shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" /> : <div className="w-8 h-8 rounded-full bg-zinc-900" />}
        </button>
      </main>

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
