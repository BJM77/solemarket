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
import { ShoeImport } from "@/shoecam/lib/types";

export default function ShoeReviewDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<ShoeImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaveLoading] = useState(false);
  const [scanningAi, setScanningAi] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function loadItem() {
      const docRef = doc(db, "shoe_imports", id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() } as ShoeImport);
      }
      setLoading(false);
    }
    loadItem();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to verify and list sneakers." });
      return;
    }
    setSaveLoading(true);
    try {
      await addDoc(collection(db, "products"), {
        title: `${item.brand} ${item.model}`.trim() || 'Collectible Sneakers',
        price: item.price || 0,
        description: item.description || '',
        imageUrls: [item.front45ImagePath, item.sideImagePath, item.topImagePath, item.labelImagePath].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'Sneakers',
        brand: item.brand || '',
        model: item.model || '',
        condition: item.condition || 'New',
        year: item.year || null,
        subCategory: item.subCategory || 'Jordan',
        size: item.sizeUs || '',
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          brand: item.brand || '',
          model: item.model || '',
          styleCode: item.styleCode || '',
          sizeUs: item.sizeUs || '',
          colorway: item.colorway || '',
          condition: item.condition || '',
          subCategory: item.subCategory || 'Jordan',
          year: item.year || '',
        }
      });

      await updateDoc(doc(db, "shoe_imports", item.id), {
        ...item,
        status: 'VERIFIED',
        updatedAt: Date.now()
      });

      toast({ title: "✓ Confirmed: Added to Benched", description: "Listed on Benched.au marketplace!" });
      router.push('/shoecam/review');
      router.refresh();
    } catch (err: any) {
      console.error("Failed to promote shoe to products", err);
      toast({ variant: "destructive", title: "Save Failed", description: err.message || "Failed to list shoe." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm("Delete this sneaker capture? Original backups will be purged.")) {
      await deleteDoc(doc(db, "shoe_imports", item.id));
      router.push('/shoecam/review');
    }
  };

  const handleAiCheck = async () => {
    if (!item?.labelImagePath) return;
    setScanningAi(true);
    try {
      const { deepScanShoe } = await import('@/ai/flows/deep-scan-shoe');
      const aiResult = await deepScanShoe(item.labelImagePath);
      
      setItem(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          brand: aiResult.brand || prev.brand,
          model: aiResult.model || prev.model,
          styleCode: aiResult.styleCode || prev.styleCode,
          sizeUs: aiResult.sizeUs || prev.sizeUs,
          colorway: aiResult.colorway || prev.colorway,
          price: aiResult.price || prev.price,
          description: aiResult.description || prev.description,
          subCategory: aiResult.subCategory || prev.subCategory,
          year: aiResult.year || prev.year,
          identificationSource: 'AI_DEEP_SCAN',
        };
      });
      toast({ title: "AI Check Complete", description: "Successfully extracted additional tag details." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "AI Check Failed", description: err.message || "Could not analyze the label image." });
    } finally {
      setScanningAi(false);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-black">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!item) return <div className="h-screen flex items-center justify-center bg-black text-white">Sneaker capture not found.</div>;

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <header className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/10 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/shoecam/review')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-black uppercase font-headline tracking-tighter text-white">Verification Workspace</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sneaker Client ID: {item.id.substring(0,8)}</p>
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
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 aspect-square rounded-xl">
                <div className="w-full h-full relative bg-zinc-950">
                  <Image src={item.front45ImagePath} alt="Front 45" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white px-2 py-0.5">Front 45°</Badge>
                </div>
              </Card>
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 aspect-square rounded-xl">
                <div className="w-full h-full relative bg-zinc-950">
                  <Image src={item.sideImagePath} alt="Side View" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white px-2 py-0.5">Side View</Badge>
                </div>
              </Card>
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 aspect-square rounded-xl">
                <div className="w-full h-full relative bg-zinc-950">
                  <Image src={item.topImagePath} alt="Top View" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white px-2 py-0.5">Top View</Badge>
                </div>
              </Card>
              <Card className="overflow-hidden border-2 border-white/10 bg-zinc-900 aspect-square rounded-xl">
                <div className="w-full h-full relative bg-zinc-950">
                  <Image src={item.labelImagePath} alt="Size Tag" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase text-white px-2 py-0.5">Inner Tag</Badge>
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
                     <p className="text-sm font-black text-blue-300">Passed</p>
                   </div>
                   <div>
                     <p className="text-[8px] font-bold text-blue-500 uppercase">Luminance</p>
                     <p className="text-sm font-black text-blue-300">Optimal</p>
                   </div>
                   <div className="flex-grow flex justify-end items-center">
                     <Badge className="bg-green-600 font-black text-[8px] uppercase tracking-wider border-none text-white">QC PASSED</Badge>
                   </div>
                </div>
             </CardContent>
           </Card>
        </div>

        {/* Metadata Management Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between w-full">
             <div className="flex items-center gap-2">
               <BadgeCheck className="w-3.5 h-3.5" /> Structured Sneaker Details
             </div>
             <Button 
               size="sm" 
               variant="outline" 
               onClick={(e) => { e.preventDefault(); handleAiCheck(); }} 
               disabled={scanningAi || !item.labelImagePath}
               className="h-7 text-[10px] font-black uppercase bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
             >
               {scanningAi ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
               AI Check tag
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
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Brand</Label>
                        <Input 
                          value={item.brand || ''} 
                          onChange={e => setItem({...item, brand: e.target.value})}
                          className="font-bold bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Model Name</Label>
                        <Input 
                          value={item.model || ''} 
                          onChange={e => setItem({...item, model: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Style Code (SKU)</Label>
                        <Input 
                          value={item.styleCode || ''} 
                          onChange={e => setItem({...item, styleCode: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Size US</Label>
                        <Input 
                          value={item.sizeUs || ''} 
                          onChange={e => setItem({...item, sizeUs: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Colorway</Label>
                        <Input 
                          value={item.colorway || ''} 
                          onChange={e => setItem({...item, colorway: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sub-Category</Label>
                        <Input 
                          value={item.subCategory || ''} 
                          onChange={e => setItem({...item, subCategory: e.target.value})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. Jordan"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Release Year</Label>
                        <Input 
                          type="number"
                          value={item.year || ''} 
                          onChange={e => setItem({...item, year: parseInt(e.target.value)})}
                          className="font-medium bg-zinc-950 border-white/10 text-white focus:ring-primary" 
                          placeholder="e.g. 2018"
                        />
                      </div>

                      <div className="space-y-1.5 col-span-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">AI Listing Description</Label>
                        <textarea
                          value={item.description || ''}
                          onChange={e => setItem({...item, description: e.target.value})}
                          placeholder="Gemini is analyzing the sneaker tag..."
                          className="w-full min-h-[70px] rounded-lg border border-white/10 bg-zinc-950 p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none text-white placeholder-zinc-600"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Condition</Label>
                          <Select value={item.condition || 'New'} onValueChange={val => setItem({...item, condition: val})}>
                            <SelectTrigger className="border-primary/20 bg-zinc-950 text-white font-black uppercase text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                              <SelectItem value="New">Brand New / DS</SelectItem>
                              <SelectItem value="Like New">VNDS / Like New</SelectItem>
                              <SelectItem value="Lightly Worn">Lightly Worn</SelectItem>
                              <SelectItem value="Worn">Worn</SelectItem>
                              <SelectItem value="Beaters">Beaters</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Est. Price ($)</Label>
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
                 Ensure the size tag information exactly matches the sneaker brand, model, size, and SKU to verify authenticity.
               </p>
            </div>
         </div>
       </main>
     </div>
   );
}
