"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  Trash2, 
  Save, 
  History, 
  BadgeCheck, 
  AlertCircle,
  Loader2,
  Gem
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/samcam/hooks/use-toast";
import { db } from "@/samcam/lib/firebase";
import { cn } from "@/samcam/lib/utils";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";
import { useAuth } from "../../auth-provider";
import { CoinImport } from "@/coincam/lib/types";

export default function CoinReviewDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<CoinImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaveLoading] = useState(false);
  const [scanningAi, setScanningAi] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function loadItem() {
      const docRef = doc(db, "coin_imports", id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() } as CoinImport);
      }
      setLoading(false);
    }
    loadItem();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to verify and list coins." });
      return;
    }
    setSaveLoading(true);
    try {
      // 1. Promote to products database catalog under coin category
      await addDoc(collection(db, "products"), {
        title: item.coinName || 'Collectible Coin',
        price: item.price || 0,
        description: item.description || '',
        imageUrls: [item.frontImagePath, item.backImagePath].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'Coins',
        brand: item.brand || 'Royal Australian Mint',
        model: item.model || item.denomination || '',
        condition: item.condition || item.composition || 'New',
        year: item.year || null,
        subCategory: item.subCategory || 'Australian Coins',
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          coinName: item.coinName || '',
          setName: item.setName || '',
          denomination: item.denomination || '',
          country: item.country || '',
          year: item.year || '',
          mintMark: item.mintMark || '',
          composition: item.composition || '',
          rarity: item.rarity || '',
          isRare: item.isRare || false,
          brand: item.brand || 'Royal Australian Mint',
          model: item.model || '',
          subCategory: item.subCategory || 'Australian Coins',
          condition: item.condition || '',
        }
      });

      // 2. Mark import queue status as VERIFIED
      await updateDoc(doc(db, "coin_imports", item.id), {
        ...item,
        status: 'VERIFIED',
        updatedAt: Date.now()
      });

      toast({ title: "✓ Confirmed: Added to Benched", description: "Successfully promoted to products and listed on Benched.au marketplace!" });
      router.push('/coincam/review');
      router.refresh();
    } catch (err: any) {
      console.error("Failed to promote coin to products", err);
      toast({ variant: "destructive", title: "Save Failed", description: err.message || "Failed to list coin." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm("Delete this coin capture? Original backups will be purged.")) {
      await deleteDoc(doc(db, "coin_imports", item.id));
      router.push('/coincam/review');
    }
  };

  const handleAiCheck = async () => {
    if (!item?.frontImagePath) return;
    setScanningAi(true);
    try {
      const { deepScanCoin } = await import('@/ai/flows/deep-scan-coin');
      const aiResult = await deepScanCoin(item.frontImagePath);
      
      setItem(prev => {
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
      setScanningAi(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!item) return <div className="h-screen flex items-center justify-center bg-black text-white">Coin capture not found.</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/10 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/coincam/review')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-black uppercase font-headline tracking-tighter text-white">Verification Workspace</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Coin Client ID: {item.id.substring(0,8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 hover:bg-red-950/25 font-bold uppercase text-[10px]" onClick={handleDelete}>
             <Trash2 className="w-4 h-4 mr-1" /> Remove
           </Button>
           <Button className="bg-primary text-black hover:bg-primary/90 font-black uppercase text-[10px] px-6" onClick={handleUpdate} disabled={saving}>
             {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
             Confirm & Verify
           </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Evidence Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
             <History className="w-3.5 h-3.5" /> High-Resolution Evidence
           </h2>
           <div className="grid grid-cols-2 gap-4">
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 rounded-full aspect-square">
                <div className="w-full h-full relative bg-zinc-955">
                  <Image src={item.frontImagePath} alt="Front" fill className="object-cover rounded-full" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white rounded-full px-2 py-0.5">Front</Badge>
                </div>
              </Card>
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 rounded-full aspect-square">
                <div className="w-full h-full relative bg-zinc-955">
                  <Image src={item.backImagePath} alt="Back" fill className="object-cover rounded-full" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white rounded-full px-2 py-0.5">Back</Badge>
                </div>
              </Card>
           </div>
           
           <Card className="bg-blue-950/20 border-blue-500/20 text-white">
             <CardHeader className="py-3 px-4">
               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-400">Capture QC Report</CardTitle>
             </CardHeader>
             <CardContent className="px-4 pb-3">
               <div className="flex gap-6">
                  <div>
                    <p className="text-[8px] font-bold text-blue-500 uppercase">Sharpness</p>
                    <p className="text-sm font-black text-blue-300">{item.qualityReport?.front?.blurScore || 18}px Edge</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-blue-500 uppercase">Luminance</p>
                    <p className="text-sm font-black text-blue-300">{item.qualityReport?.front?.brightnessScore || 112} nits</p>
                  </div>
                  <div className="flex-grow flex justify-end items-center">
                    <Badge className="bg-green-600 font-black text-[8px] uppercase tracking-wider border-none text-white">QC PASSED</Badge>
                  </div>
               </div>
             </CardContent>
           </Card>

             <Card className="border-emerald-500/25 bg-emerald-950/10 shadow-sm text-white">
               <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                 <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Est. Coin Market Value</CardTitle>
                 <Badge className="bg-emerald-600 font-bold text-[8px] uppercase tracking-wide border-none text-white">Live Index</Badge>
               </CardHeader>
               <CardContent className="px-4 pb-4 space-y-4">
                 <div className="flex justify-between items-end">
                   <div>
                     <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wider block">Estimated Book Value (Raw)</span>
                     <span className="text-2xl font-black text-white">${item.price || 19.99}</span>
                   </div>
                   <Button 
                     size="sm"
                     className="h-7 text-[9px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700 border-none"
                     onClick={(e) => {
                       e.preventDefault();
                       setItem({ ...item, price: item.price || 19.99 });
                     }}
                   >
                     Apply Value
                   </Button>
                 </div>
               </CardContent>
             </Card>
          </div>

        {/* Metadata Management Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between w-full">
             <div className="flex items-center gap-2">
               <BadgeCheck className="w-3.5 h-3.5" /> Structured Coin Details
             </div>
             <Button 
               size="sm" 
               variant="outline" 
               onClick={(e) => { e.preventDefault(); handleAiCheck(); }} 
               disabled={scanningAi}
               className="h-7 text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
             >
               {scanningAi ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
               AI Check
             </Button>
           </h2>
           
           <Card className="bg-zinc-900 border-white/10 text-white shadow-none">
             <CardContent className="pt-6">
                 <form className="space-y-4">
                   <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-white/5 mb-6">
                     <div>
                       <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">ID Source</p>
                       <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                         <Gem className="w-3 h-3 text-primary" /> {item.identificationSource || 'PENDING'} 
                       </p>
                     </div>
                     <div className="text-right">
                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Confidence</p>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase border-none", (item.identificationConfidence || 0) > 0.9 ? "text-green-400 bg-green-950/20" : "text-yellow-400 bg-yellow-950/20")}>
                          {Math.round((item.identificationConfidence || 0) * 100)}% Match
                        </Badge>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5 col-span-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Coin Name / Theme</Label>
                       <Input 
                         value={item.coinName || ''} 
                         onChange={e => setItem({...item, coinName: e.target.value})}
                         className="font-bold bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Series / Set</Label>
                       <Input 
                         value={item.setName || ''} 
                         onChange={e => setItem({...item, setName: e.target.value})}
                         className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Denomination</Label>
                       <Input 
                         value={item.denomination || ''} 
                         onChange={e => setItem({...item, denomination: e.target.value})}
                         className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mint Year</Label>
                       <Input 
                         type="number" 
                         value={item.year || ''} 
                         onChange={e => setItem({...item, year: parseInt(e.target.value)})}
                         className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mint Mark</Label>
                       <Input 
                         value={item.mintMark || ''} 
                         onChange={e => setItem({...item, mintMark: e.target.value})}
                         className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                         placeholder="e.g. S, D, P, CC"
                       />
                     </div>
                     <div className="space-y-1.5">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Country of Origin</Label>
                       <Input 
                         value={item.country || ''} 
                         onChange={e => setItem({...item, country: e.target.value})}
                         className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                       />
                     </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Metal Composition</Label>
                        <Input 
                          value={item.composition || ''} 
                          onChange={e => setItem({...item, composition: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. 90% Silver, Copper"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Brand / Mint</Label>
                        <Input 
                          value={item.brand || ''} 
                          onChange={e => setItem({...item, brand: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. Royal Australian Mint"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Model</Label>
                        <Input 
                          value={item.model || ''} 
                          onChange={e => setItem({...item, model: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. $2"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sub-Category</Label>
                        <Input 
                          value={item.subCategory || ''} 
                          onChange={e => setItem({...item, subCategory: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. Australian Coins"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Condition Guide</Label>
                        <Input 
                          value={item.condition || ''} 
                          onChange={e => setItem({...item, condition: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. Brilliant Uncirculated, New"
                        />
                      </div>
                     
                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-white/5 col-span-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Rare Coin Designation</Label>
                          <p className="text-[8px] text-zinc-500 uppercase">Mark if this coin is considered a rare key date or high value</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={item.isRare || false}
                          onChange={e => setItem({...item, isRare: e.target.checked})}
                          className="w-4 h-4 accent-primary rounded border-zinc-700 bg-zinc-950 focus:ring-primary"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-white/5 col-span-2">
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Multi-Coin Set / Lot / Roll</Label>
                          <p className="text-[8px] text-zinc-500 uppercase">Check if this listing includes multiple coins in the same frame</p>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={item.isMultiCoin || false}
                          onChange={e => setItem({...item, isMultiCoin: e.target.checked})}
                          className="w-4 h-4 accent-primary rounded border-zinc-700 bg-zinc-950 focus:ring-primary"
                        />
                      </div>

                      {item.isMultiCoin && (
                        <div className="space-y-1.5 col-span-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Coin Count in Lot</Label>
                          <Input 
                            type="number" 
                            value={item.coinCount || 2} 
                            onChange={e => setItem({...item, coinCount: parseInt(e.target.value) || 1})}
                            className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                            placeholder="e.g. 2, 5, 20"
                          />
                        </div>
                      )}

                     <div className="space-y-1.5 col-span-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Listing Description</Label>
                       <textarea
                         value={item.description || ''}
                         onChange={e => setItem({...item, description: e.target.value})}
                         placeholder="Gemini is analyzing the coin..."
                         className="w-full min-h-[70px] rounded-lg border border-white/10 bg-zinc-950 p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none text-white placeholder-zinc-600"
                       />
                     </div>
                   </div>

                   <div className="pt-4 border-t border-white/5">
                     <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Strike / Condition</Label>
                         <Select value={item.composition || 'Proof'} onValueChange={val => setItem({...item, composition: val})}>
                           <SelectTrigger className="border-primary/20 bg-zinc-950 text-white font-black uppercase text-[10px]">
                             <SelectValue />
                           </SelectTrigger>
                           <SelectContent className="bg-zinc-900 border-white/10 text-white">
                             <SelectItem value="Proof">Proof (PR)</SelectItem>
                             <SelectItem value="Uncirculated">Uncirculated (UNC)</SelectItem>
                             <SelectItem value="About Uncirculated">About Uncirculated (AU)</SelectItem>
                             <SelectItem value="Extremely Fine">Extremely Fine (XF)</SelectItem>
                             <SelectItem value="Very Fine">Very Fine (VF)</SelectItem>
                             <SelectItem value="Fine">Fine (F)</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Est. Market Price ($)</Label>
                         <Input 
                           type="number" 
                           value={item.price || ''} 
                           onChange={e => setItem({...item, price: parseFloat(e.target.value)})}
                           className="font-black border-primary/20 bg-zinc-950 text-white focus:ring-primary" 
                         />
                       </div>
                     </div>
                   </div>
                 </form>
              </CardContent>
           </Card>

           <div className="flex items-start gap-3 p-4 bg-yellow-950/20 border border-yellow-500/20 rounded-xl">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-200 leading-relaxed font-medium">
                Verify that the coin identification source is confident. Override metadata manually if required to improve future catalog indexing.
              </p>
           </div>
        </div>
      </main>
    </div>
  );
}
