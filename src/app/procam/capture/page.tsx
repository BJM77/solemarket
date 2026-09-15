"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Send, Layers, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Settings } from "lucide-react";

import { useToast } from "@/samcam/hooks/use-toast";
import { db } from "@/samcam/lib/firebase";
import { cn } from "@/lib/utils/ui";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker } from "@/samcam/components/sync-status-tracker";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/procam/auth-provider";
import { audioSynth } from "@/samcam/lib/audio-effects";

// Feature Abstractions
import { useScannerEngine } from "@/features/scanner/engine/use-scanner-engine";
import { ScannerViewport } from "@/features/scanner/ui/ScannerViewport";
import { ScannerSyncOverlay } from "@/features/scanner/ui/ScannerSyncOverlay";
import { procamMode, ProcamReviewData } from "@/features/scanner/modes/procam";
import { Loader2 } from "lucide-react";

export default function ProPhotoBooth() {
  const router = useRouter();
  const { toast } = useToast();
  const errorLog = useErrorLog();
  const { user } = useAuth();
  
  const {
    camera,
    boothStep,
    reviewData,
    setReviewData,
    isProcessing,
    labStatus,
    syncStatuses,
    aiScanning,
    setAiScanning,
    cameraCollapsed,
    currentSequenceStepName,
    capturedUrls,
    handleCapture,
    resetBooth,
  } = useScannerEngine<ProcamReviewData>({
    modeConfig: procamMode
  });

  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [hudPosition, setHudPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [brightnessThreshold, setBrightnessThreshold] = useState(50);
  const [focusThreshold, setFocusThreshold] = useState(50);

  const reviewPanelRef = useRef<HTMLDivElement>(null);

  const handleAiCheck = async () => {
    if (!reviewData?.mainUrl || !reviewData?.secondaryUrl) {
      toast({ title: "Missing Images", description: "Images not available for AI scan." });
      return;
    }
    setAiScanning(true);
    try {
      const aiResult = await procamMode.aiFlow([reviewData.mainUrl, reviewData.secondaryUrl]);
      
      setReviewData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...aiResult
        };
      });
      toast({ title: "AI Check Complete", description: "Extracted additional product details." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message });
    } finally {
      setAiScanning(false);
    }
  };

  const handleSubmitToBench = async () => {
    if (!reviewData) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to list products." });
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "products"), {
        title: reviewData.title,
        price: reviewData.price || 0,
        description: reviewData.description || '',
        imageUrls: [reviewData.mainUrl, reviewData.secondaryUrl].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: reviewData.category || 'Other Stuff',
        brand: reviewData.brand,
        model: reviewData.model,
        condition: reviewData.condition,
        year: reviewData.year || null,
        subCategory: 'Pro Listings',
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          brand: reviewData.brand,
          model: reviewData.model,
          condition: reviewData.condition,
        }
      });

      await updateDoc(doc(db, "pro_imports", (reviewData as any).docId), {
        status: 'VERIFIED',
        ...reviewData,
        updatedAt: Date.now()
      });

      audioSynth.playChime();
      toast({ title: "✓ Submitted to Bench", description: "Product is now live on the marketplace!" });
      resetBooth();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submit Failed", description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAndQueue = () => {
    toast({ title: "Queued for Review", description: "Product saved to the review queue." });
    resetBooth();
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
                Procam <Badge variant="secondary" className="bg-white/10 text-[10px] px-1 py-0 h-4">PRO</Badge>
              </h1>
              <p className="text-xs text-white/50">{camera.deviceProfile.name}</p>
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
                  selectedDevice={camera.selectedDevice}
                  setSelectedDevice={camera.setSelectedDevice}
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
        <ScannerViewport
          videoRef={camera.videoRef}
          isProcessing={isProcessing}
          labStatus={labStatus}
          torchActive={camera.torchActive}
          onToggleTorch={camera.toggleTorch}
          onCapture={handleCapture}
          currentSequenceStepName={currentSequenceStepName}
          cameraCollapsed={cameraCollapsed}
          onReset={resetBooth}
          reviewRoute="/procam/review"
        />

        {boothStep !== 'CAPTURE' && (
          <div ref={reviewPanelRef} className="p-4 space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            {aiScanning ? (
              <ScannerSyncOverlay capturedImages={capturedUrls} />
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
                    <CardTitle className="text-lg">Product Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-1.5">
                        <Label>Title / Name</Label>
                        <Input value={reviewData.title} onChange={e => setReviewData({...reviewData, title: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Brand / Maker</Label>
                        <Input value={reviewData.brand} onChange={e => setReviewData({...reviewData, brand: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Model</Label>
                        <Input value={reviewData.model} onChange={e => setReviewData({...reviewData, model: e.target.value})} className="bg-black/50 border-white/10" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Category</Label>
                        <Input value={reviewData.category} onChange={e => setReviewData({...reviewData, category: e.target.value})} className="bg-black/50 border-white/10" />
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
                      <div className="space-y-1.5">
                        <Label>Year</Label>
                        <Input type="number" value={reviewData.year || ''} onChange={e => setReviewData({...reviewData, year: parseInt(e.target.value) || undefined})} className="bg-black/50 border-white/10" />
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
