"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Send, Layers, BadgeCheck, Gem } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Settings, Loader2 } from "lucide-react";

import { useToast } from "@/samcam/hooks/use-toast";
import { db } from "@/samcam/lib/firebase";
import { cn } from "@/samcam/lib/utils";
import SettingsSheet from "@/samcam/components/settings-sheet";
import { useErrorLog } from "@/samcam/hooks/use-error-log";
import { SyncStatusTracker } from "@/samcam/components/sync-status-tracker";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/app/coincam/auth-provider";
import { audioSynth } from "@/samcam/lib/audio-effects";

// Feature Abstractions
import { useScannerEngine } from "@/features/scanner/engine/use-scanner-engine";
import { ScannerViewport } from "@/features/scanner/ui/ScannerViewport";
import { coincamMode, CoincamReviewData } from "@/features/scanner/modes/coincam";

export default function CoinPhotoBooth() {
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
  } = useScannerEngine<CoincamReviewData>({
    modeConfig: coincamMode
  });

  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showHUD, setShowHUD] = useState(true);
  const [hudPosition, setHudPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [brightnessThreshold, setBrightnessThreshold] = useState(50);
  const [focusThreshold, setFocusThreshold] = useState(50);

  const reviewPanelRef = useRef<HTMLDivElement>(null);

  const handleAiCheck = async () => {
    if (!reviewData?.mainUrl) {
      toast({ title: "Missing Images", description: "Image not available for AI scan." });
      return;
    }
    setAiScanning(true);
    try {
      const aiResult = await coincamMode.aiFlow([reviewData.mainUrl, reviewData.secondaryUrl]);
      
      setReviewData((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...aiResult,
          identificationSource: 'AI_DEEP_SCAN',
        };
      });
      toast({ title: "AI Check Complete", description: "Successfully extracted additional coin details." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message || "Could not analyze the coin image." });
    } finally {
      setAiScanning(false);
    }
  };

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
        imageUrls: [reviewData.mainUrl, reviewData.secondaryUrl].filter(Boolean),
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
        ...reviewData,
        updatedAt: Date.now()
      });

      audioSynth.playChime();
      toast({ title: "✓ Submitted to Bench", description: "Coin is now live on the marketplace!" });
      resetBooth();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submit Failed", description: err.message || "Failed to list product." });
    } finally {
      setSaving(false);
    }
  };

  const handleSkipAndQueue = () => {
    toast({ title: "Queued for Review", description: "Coin saved to the review queue. You can edit it later." });
    resetBooth();
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

        {/* ─── CAMERA VIEW ────────────────────────────────────────────── */}
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
        />

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
                    {capturedUrls.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 overflow-hidden">
                        <img src={url} className="w-full h-full object-cover opacity-70" />
                      </div>
                    ))}
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
                          value={reviewData.coinName || ''} 
                          onChange={e => setReviewData({...reviewData, coinName: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label className="text-white/70">Set Name</Label>
                        <Input 
                          value={reviewData.setName || ''} 
                          onChange={e => setReviewData({...reviewData, setName: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                          placeholder="e.g. Lunar Series"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/70">Denomination</Label>
                        <Input 
                          value={reviewData.denomination || ''} 
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
                          value={reviewData.mintMark || ''} 
                          onChange={e => setReviewData({...reviewData, mintMark: e.target.value})} 
                          className="bg-black/50 border-white/10 focus-visible:ring-blue-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-white/70">Condition</Label>
                        <Input 
                          value={reviewData.condition || ''} 
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
                          value={reviewData.description || ''} 
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
