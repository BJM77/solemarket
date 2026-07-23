"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target, Sun, Gauge, Flame, CheckCircle2, Loader2, RefreshCw, Layers, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { analyzeImageQuality } from "@/samcam/lib/image-processing";
import { db, storage, auth } from "@/samcam/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Badge } from "@/samcam/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/samcam/components/ui/sheet";
import { Progress } from "@/samcam/components/ui/progress";
import { syncStorage, PendingUpload } from "@/samcam/lib/sync-storage";
import { cn } from "@/samcam/lib/utils";
import { useToast } from "@/samcam/hooks/use-toast";

const INTERNAL_TOKEN = "benched_studio_v4_6_secure";

export default function BenchedPhotoBooth() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [lastQuality, setLastQuality] = useState<any>(null);
  const [currentSide, setCurrentSide] = useState<'FRONT' | 'BACK'>('FRONT');
  const [tempCapture, setTempCapture] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Robust Camera Lifecycle
  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.error("Camera access failed", err);
        toast({ 
          variant: "destructive", 
          title: "Camera Error", 
          description: err.message || "Please enable camera permissions." 
        });
      }
    };
    
    startCamera();
    syncStorage.getAll().then(setSyncQueue);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);

  const capture = async () => {
    if (!videoRef.current || isProcessing) return;
    setIsProcessing(true);
    setLabStatus("LOCKING...");

    try {
      const v = videoRef.current;
      const c = document.createElement('canvas');
      c.width = 800; c.height = 1120;
      const ctx = c.getContext('2d', { alpha: false })!;
      
      const xOffset = (v.videoWidth - 800) / 2;
      const yOffset = (v.videoHeight - 1120) / 2;
      ctx.drawImage(v, xOffset, yOffset, 800, 1120, 0, 0, 800, 1120);

      const q = analyzeImageQuality(c);
      setLastQuality(q);

      if (!q.isAcceptable) {
        setLabStatus(q.messages[0] || "ADJUST...");
        setTimeout(() => setLabStatus("READY"), 1500);
        setIsProcessing(false);
        return;
      }

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
          
          fetch('/api/identify', {
            method: 'POST',
            headers: { 'X-Benched-Token': INTERNAL_TOKEN, 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardId: id, frontImage: b64 })
          }).then(r => r.json()).then(res => {
            if (db) {
              updateDoc(doc(db, "card_imports", id), { ...res, status: 'VERIFIED' }).catch(console.error);
            }
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

  useEffect(() => {
    let isSyncing = false;

    const processQueue = async () => {
      if (isSyncing || syncQueue.length === 0) return;
      
      const activeItem = syncQueue.find(i => i.status === 'PENDING' || i.status === 'ERROR');
      if (!activeItem || uploadProgress[activeItem.id] !== undefined) return;

      if (!storage) return;

      isSyncing = true;
      const fRef = ref(storage, `raw/${activeItem.id}_front.jpg`);
      const bRef = ref(storage, `raw/${activeItem.id}_back.jpg`);

      const uploadTask = uploadBytesResumable(fRef, activeItem.frontBlob);
      
      uploadTask.on('state_changed', 
        s => setUploadProgress(p => ({...p, [activeItem.id]: (s.bytesTransferred/s.totalBytes)*100})),
        async (error) => {
          const updated: PendingUpload = { ...activeItem, status: 'ERROR', error: error.message, retries: activeItem.retries + 1 };
          await syncStorage.update(updated);
          setSyncQueue(prev => prev.map(i => i.id === activeItem.id ? updated : i));
          setUploadProgress(p => { const newP = {...p}; delete newP[activeItem.id]; return newP; });
          isSyncing = false;
        },
        async () => {
          try {
            const fUrl = await getDownloadURL(fRef);
            let bUrl = "";
            if (activeItem.backBlob) {
              await uploadBytesResumable(bRef, activeItem.backBlob);
              bUrl = await getDownloadURL(bRef);
            }
            if (db) {
              const currentUser = auth.currentUser;
              await setDoc(doc(db, "card_imports", activeItem.id), {
                id: activeItem.id, 
                userId: currentUser?.uid || "anonymous",
                frontImagePath: fUrl, 
                backImagePath: bUrl, 
                status: 'CAPTURED', 
                createdAt: activeItem.createdAt, 
                serverTimestamp: serverTimestamp()
              }, { merge: true });
            }
            await syncStorage.remove(activeItem.id);
            setSyncQueue(prev => prev.filter(i => i.id !== activeItem.id));
            setUploadProgress(p => { const newP = {...p}; delete newP[activeItem.id]; return newP; });
          } catch (e) {
            console.error("Sync Finalization Error", e);
          } finally {
            isSyncing = false;
          }
        }
      );
    };

    const interval = setInterval(processQueue, 2000);
    return () => clearInterval(interval);
  }, [syncQueue, uploadProgress]);

  return (
    <div className="h-screen bg-black text-white font-mono flex flex-col overflow-hidden">
      <header className="p-3 bg-zinc-900 border-b border-white/10 flex justify-between items-center z-20">
        <Button variant="ghost" size="icon" onClick={() => router.push('/samcam')}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex gap-3 items-center">
          <Badge className={cn("text-[9px] font-black uppercase tracking-widest", currentSide === 'FRONT' ? "bg-primary" : "bg-orange-500")}>
            {currentSide === 'FRONT' ? 'Capture Front' : 'Flip for Back'}
          </Badge>
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
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale" />
        
        <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 text-[10px] w-40 z-10">
           <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
             <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Gauge className="w-3 h-3" /> Focus</span>
             <span className={cn("font-black", (lastQuality?.blurScore || 0) > 15 ? "text-green-500" : "text-red-500")}>{lastQuality?.blurScore || 0}</span>
           </div>
           <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
             <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Sun className="w-3 h-3" /> Light</span>
             <span className="font-black text-yellow-500">{lastQuality?.brightnessScore || 0} LUX</span>
           </div>
           <div className="flex justify-between">
             <span className="text-zinc-500 flex gap-1.5 uppercase font-bold"><Target className="w-3 h-3" /> Glare</span>
             <span className={cn("font-black", (lastQuality?.glarePercentage || 0) < 15 ? "text-green-500" : "text-red-500")}>{lastQuality?.glarePercentage || 0}%</span>
           </div>
        </div>

        <div className="w-72 md:w-80 aspect-[2.5/3.5] border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center bg-white/5 relative">
           <div className="text-center">
              <Badge className="bg-zinc-900/90 px-6 py-2 uppercase tracking-[0.3em] font-black text-[10px] border border-white/10 mb-4">{labStatus}</Badge>
              {currentSide === 'BACK' && <Layers className="w-12 h-12 mx-auto text-orange-500 animate-bounce" />}
           </div>
        </div>

        <button 
          onClick={capture} 
          disabled={isProcessing} 
          className="absolute bottom-10 w-20 h-20 bg-white rounded-full border-8 border-zinc-900 active:scale-90 shadow-[0_0_50px_rgba(255,255,255,0.2)] flex items-center justify-center transition-all disabled:opacity-50"
        >
          {isProcessing ? <Loader2 className="w-10 h-10 text-zinc-900 animate-spin" /> : <div className="w-8 h-8 rounded-full bg-zinc-900" />}
        </button>
      </main>
    </div>
  );
}
