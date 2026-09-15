import { useState, useRef, useEffect, useCallback } from 'react';
import { PendingUpload, syncStorage } from '@/procam/lib/sync-storage';
import { syncService, SyncResult, SyncConfig, GenericPendingUpload } from '@/features/scanner/services/sync-service';
import { SyncStatus } from '@/samcam/components/sync-status-tracker';
import { audioSynth } from '@/samcam/lib/audio-effects';
import { ScannerModeConfig, BoothStep } from './types';
import { useToast } from '@/samcam/hooks/use-toast';
import { useCamera } from './use-camera';

interface UseScannerEngineProps<TReview extends Record<string, any>> {
  modeConfig: ScannerModeConfig<TReview>;
}

export function useScannerEngine<TReview extends Record<string, any>>({
  modeConfig
}: UseScannerEngineProps<TReview>) {
  const { toast } = useToast();
  
  const camera = useCamera();

  const [boothStep, setBoothStep] = useState<BoothStep>('CAPTURE');
  const [reviewData, setReviewData] = useState<TReview | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [labStatus, setLabStatus] = useState("READY");
  
  const [syncQueue, setSyncQueue] = useState<PendingUpload[]>([]);
  const [syncStatuses, setSyncStatuses] = useState<Map<string, SyncStatus>>(new Map());
  
  const [currentSequenceIndex, setCurrentSequenceIndex] = useState(0);
  const [capturedBlobs, setCapturedBlobs] = useState<Blob[]>([]);
  const [capturedUrls, setCapturedUrls] = useState<string[]>([]);
  
  const [aiScanning, setAiScanning] = useState(false);
  const [cameraCollapsed, setCameraCollapsed] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  
  const activeUploadRef = useRef<string | null>(null);
  const createdUrlsRef = useRef<string[]>([]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    const urls = createdUrlsRef.current;
    return () => {
      urls.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) { }
      });
    };
  }, []);

  // Load initial queue
  useEffect(() => {
    syncStorage.getAll().then(setSyncQueue);
  }, []);

  // Sync Queue Processing
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
        const syncConfig: SyncConfig = {
          storagePathPrefix: modeConfig.storagePathPrefix,
          firestoreCollection: modeConfig.firestoreCollection,
          aiIdentifyFn: async (front, back) => {
             // Adapt the AI flow. The generic sync service passes base64, but our AI flows might expect URLs.
             // We will handle this in the specific modes or modify generic sync service later.
             // For now, let's assume aiFlow can handle it or we pass it the URLs we created.
             const urls = [activeItem.mainBlob, activeItem.secondaryBlob]
                .filter(Boolean)
                .map(b => URL.createObjectURL(b!));
             
             return modeConfig.aiFlow(urls);
          },
          processResultData: modeConfig.processResultData,
        };

        const genericUpload: GenericPendingUpload = {
            id: activeItem.id,
            frontBlob: activeItem.mainBlob,
            backBlob: activeItem.secondaryBlob,
            createdAt: new Date(activeItem.createdAt).toISOString()
        };

        const result: SyncResult = await syncService.processUpload(
          genericUpload, syncConfig,
          (status) => setSyncStatuses(prev => new Map(prev).set(activeItem.id, status))
        );

        if (result.success) {
          audioSynth.playChime();
          setSyncQueue(prev => prev.filter(i => i.id !== activeItem.id));
          await syncStorage.remove(activeItem.id);
          
          setTimeout(() => {
            setSyncStatuses(prev => { const next = new Map(prev); next.delete(activeItem.id); return next; });
          }, 6000);

          if (activeUploadRef.current === activeItem.id && result.aiResult) {
            setReviewData({
              ...result.aiResult,
              docId: result.docId || activeItem.id,
              mainUrl: result.frontUrl || '',
              secondaryUrl: result.backUrl || '',
            } as any);
            setBoothStep('REVIEW');
            setAiScanning(false);
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
  }, [syncQueue, camera.deviceProfile, modeConfig, toast]);

  const triggerVibrate = (pattern: number | number[]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
  };

  const handleCaptureResult = async (blob: Blob) => {
    const objectUrl = URL.createObjectURL(blob);
    createdUrlsRef.current.push(objectUrl);
    
    const newBlobs = [...capturedBlobs, blob];
    const newUrls = [...capturedUrls, objectUrl];
    
    setCapturedBlobs(newBlobs);
    setCapturedUrls(newUrls);

    if (currentSequenceIndex < modeConfig.captureSequence.length - 1) {
      // Move to next shot
      setCurrentSequenceIndex(prev => prev + 1);
      setLabStatus(`CAPTURE ${modeConfig.captureSequence[currentSequenceIndex + 1]}`);
      triggerVibrate([30, 50, 30]);
      setIsProcessing(false);
    } else {
      // Sequence complete, queue it up
      const id = `${modeConfig.id}_${Date.now()}`;
      const newUpload: PendingUpload = {
        id,
        mainBlob: newBlobs[0],
        secondaryBlob: newBlobs[1] || undefined,
        status: 'PENDING',
        retries: 0,
        createdAt: Date.now()
      };

      await syncStorage.add(newUpload);
      setSyncQueue(prev => [...prev, newUpload]);

      setLabStatus("ANALYZING");
      setActiveUploadId(id);
      activeUploadRef.current = id;
      setBoothStep('SUBMITTING');
      setAiScanning(true);
      setCameraCollapsed(true);
      setIsProcessing(false);
    }
  };

  const handleCapture = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    camera.captureFrame(handleCaptureResult, setLabStatus);
  };

  const resetBooth = useCallback(() => {
    setBoothStep('CAPTURE');
    setReviewData(null);
    setActiveUploadId(null);
    activeUploadRef.current = null;
    setCapturedBlobs([]);
    setCapturedUrls([]);
    setCurrentSequenceIndex(0);
    setCameraCollapsed(false);
    setAiScanning(false);
    setLabStatus("READY");
  }, []);

  return {
    camera,
    // State
    boothStep, setBoothStep,
    reviewData, setReviewData,
    isProcessing, setIsProcessing,
    labStatus, setLabStatus,
    syncQueue, setSyncQueue,
    syncStatuses,
    aiScanning, setAiScanning,
    cameraCollapsed, setCameraCollapsed,
    
    // Sequence
    currentSequenceIndex,
    currentSequenceStepName: modeConfig.captureSequence[currentSequenceIndex],
    capturedUrls,
    
    // Actions
    handleCapture,
    triggerVibrate,
    resetBooth,
  };
}
