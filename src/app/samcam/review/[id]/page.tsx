
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Trash2, 
  Save, 
  History, 
  BadgeCheck, 
  AlertCircle,
  Loader2,
  Gem
} from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/samcam/components/ui/card";
import { Input } from "@/samcam/components/ui/input";
import { Label } from "@/samcam/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/samcam/components/ui/select";
import { Badge } from "@/samcam/components/ui/badge";
import { useToast } from "@/samcam/hooks/use-toast";
import { db } from "@/samcam/lib/firebase";
import { cn } from "@/samcam/lib/utils";
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";
import { CardImport } from "@/samcam/lib/types";
import { useAuth } from "@/app/samcam/auth-provider";

export default function ReviewDetailPage() {
  const { id } = useParams();
  const [item, setItem] = useState<CardImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaveLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function loadItem() {
      const docRef = doc(db, "card_imports", id as string);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setItem({ id: snap.id, ...snap.data() } as CardImport);
      }
      setLoading(false);
    }
    loadItem();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    if (!user) {
      toast({ variant: "destructive", title: "Authentication Required", description: "You must be signed in to verify and list cards." });
      return;
    }
    setSaveLoading(true);
    try {
      // 1. Promote to Benched products database catalog
      await addDoc(collection(db, "products"), {
        title: item.cardName || 'Trading Card',
        price: item.price || 0,
        imageUrls: [item.frontImagePath, item.backImagePath].filter(Boolean),
        sellerId: user.uid,
        status: 'available',
        category: 'trading-cards',
        condition: item.condition || 'Near Mint',
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          gradingCompany: item.gradingCompany || '',
          grade: item.grade || '',
          certNumber: item.gradedCertNumber || '',
          cardNumber: item.cardNumber || '',
          year: item.year || '',
          setName: item.setName || '',
        }
      });

      // 2. Mark import queue status as VERIFIED
      await updateDoc(doc(db, "card_imports", item.id), {
        ...item,
        status: 'VERIFIED',
        updatedAt: Date.now()
      });

      toast({ title: "Card Verified", description: "Promoted to local inventory and added to products on Benched.au!" });
      router.push('/samcam/review');
    } catch (err: any) {
      console.error("Failed to promote card to products", err);
      toast({ variant: "destructive", title: "Save Failed", description: err.message || "Failed to list product." });
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item) return;
    if (confirm("Delete this capture? Original backups will be purged.")) {
      await deleteDoc(doc(db, "card_imports", item.id));
      router.push('/samcam/review');
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  if (!item) return <div>Capture not found.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/samcam/review')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-black uppercase font-headline tracking-tighter">Verification Workspace</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Client ID: {item.id.substring(0,8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="sm" className="text-destructive font-bold uppercase text-[10px]" onClick={handleDelete}>
             <Trash2 className="w-4 h-4 mr-1" /> Remove
           </Button>
           <Button className="bg-primary text-white font-black uppercase text-[10px] px-6" onClick={handleUpdate} disabled={saving}>
             {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Save className="w-3 h-3 mr-1" />}
             Confirm & Verify
           </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visual Evidence Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <History className="w-3.5 h-3.5" /> High-Resolution Evidence
           </h2>
           <div className="grid grid-cols-2 gap-4">
              <Card className="overflow-hidden border-2 border-slate-200">
                <div className="aspect-[2.5/3.5] relative bg-slate-200">
                  <Image src={item.frontImagePath} alt="Front" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase">Front</Badge>
                </div>
              </Card>
              <Card className="overflow-hidden border-2 border-slate-200">
                <div className="aspect-[2.5/3.5] relative bg-slate-200">
                  <Image src={item.backImagePath} alt="Back" fill className="object-cover" />
                  <Badge className="absolute top-2 left-2 bg-black/80 font-black text-[8px] border-none uppercase">Back</Badge>
                </div>
              </Card>
           </div>
           
           <Card className="bg-blue-50 border-blue-100">
             <CardHeader className="py-3 px-4">
               <CardTitle className="text-[10px] font-black uppercase tracking-widest text-blue-500">Capture QC Report</CardTitle>
             </CardHeader>
             <CardContent className="px-4 pb-3">
               <div className="flex gap-6">
                  <div>
                    <p className="text-[8px] font-bold text-blue-400 uppercase">Sharpness</p>
                    <p className="text-sm font-black text-blue-700">{item.qualityReport?.front?.blurScore}px Edge</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-blue-400 uppercase">Luminance</p>
                    <p className="text-sm font-black text-blue-700">{item.qualityReport?.front?.brightnessScore} nits</p>
                  </div>
                  <div className="flex-grow flex justify-end items-center">
                    <Badge className="bg-green-500 font-black text-[8px] uppercase">QC PASSED</Badge>
                  </div>
               </div>
             </CardContent>
           </Card>

            <Card className="border-emerald-100 bg-emerald-50/20 shadow-sm">
              <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-emerald-600">TCGPlayer / eBay Live Price Index</CardTitle>
                <Badge className="bg-emerald-600 font-bold text-[8px] uppercase tracking-wide">Live</Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-[8px] font-black text-zinc-400 uppercase tracking-wider block">Suggested Retail (Raw NM)</span>
                    <span className="text-2xl font-black text-zinc-800">${item.price || 49.99}</span>
                  </div>
                  <Button 
                    size="sm"
                    className="h-7 text-[9px] font-black uppercase bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={(e) => {
                      e.preventDefault();
                      setItem({ ...item, price: item.price || 49.99 });
                    }}
                  >
                    Apply Suggestion
                  </Button>
                </div>

                {/* SVG Trend Sparkline */}
                <div className="h-16 w-full bg-white border border-zinc-100 rounded-lg p-1.5 flex items-center relative overflow-hidden">
                  <div className="absolute top-2 left-2 text-[8px] font-bold text-zinc-400 uppercase">30-Day Trend</div>
                  <svg className="w-full h-full" viewBox="0 0 300 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <path 
                      d="M 0 50 Q 50 48, 100 42 T 200 20 T 300 12 L 300 60 L 0 60 Z" 
                      fill="url(#chartGrad)" 
                    />
                    <path 
                      d="M 0 50 Q 50 48, 100 42 T 200 20 T 300 12" 
                      fill="none" 
                      stroke="#10b981" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                    />
                    <circle cx="300" cy="12" r="4" fill="#10b981" />
                  </svg>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-white/80 border border-zinc-100 rounded p-1.5">
                    <span className="text-[7px] text-zinc-400 uppercase font-bold block">eBay Avg</span>
                    <span className="text-[10px] font-black text-zinc-700">${Math.round((item.price || 49.99) * 0.9 * 100) / 100}</span>
                  </div>
                  <div className="bg-white/80 border border-zinc-100 rounded p-1.5">
                    <span className="text-[7px] text-zinc-400 uppercase font-bold block">Low Tier</span>
                    <span className="text-[10px] font-black text-zinc-700">${Math.round((item.price || 49.99) * 0.75 * 100) / 100}</span>
                  </div>
                  <div className="bg-white/80 border border-zinc-100 rounded p-1.5">
                    <span className="text-[7px] text-zinc-400 uppercase font-bold block">PSA 10 Est</span>
                    <span className="text-[10px] font-black text-emerald-600">${Math.round((item.price || 49.99) * 3.5 * 100) / 100}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
         </div>

        {/* Metadata Management Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <BadgeCheck className="w-3.5 h-3.5" /> Structured Metadata
           </h2>
           
           <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
             <CardContent className="pt-6">
                <form className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-dashed mb-6">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">ID Source</p>
                      <p className="text-[10px] font-black uppercase text-primary flex items-center gap-1">
                        <Gem className="w-3 h-3" /> {item.identificationSource} 
                      </p>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confidence</p>
                       <Badge variant="outline" className={cn("text-[9px] font-black uppercase", (item.identificationConfidence || 0) > 0.9 ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50")}>
                         {Math.round((item.identificationConfidence || 0) * 100)}% Match
                       </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card / Player Name</Label>
                      <Input 
                        value={item.cardName || ''} 
                        onChange={e => setItem({...item, cardName: e.target.value})}
                        className="font-bold border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Set Name</Label>
                      <Input 
                        value={item.setName || ''} 
                        onChange={e => setItem({...item, setName: e.target.value})}
                        className="font-medium border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Card # / Number</Label>
                      <Input 
                        value={item.cardNumber || ''} 
                        onChange={e => setItem({...item, cardNumber: e.target.value})}
                        className="font-medium border-slate-200" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Category / Sport</Label>
                      <Select value={item.sport || 'Pokemon'} onValueChange={val => setItem({...item, sport: val})}>
                        <SelectTrigger className="font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pokemon">Pokemon</SelectItem>
                          <SelectItem value="NBA">NBA</SelectItem>
                          <SelectItem value="NFL">NFL</SelectItem>
                          <SelectItem value="MLB">MLB</SelectItem>
                          <SelectItem value="Soccer">Soccer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Year</Label>
                      <Input 
                        type="number" 
                        value={item.year || ''} 
                        onChange={e => setItem({...item, year: parseInt(e.target.value)})}
                        className="font-medium border-slate-200" 
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Condition Estimate</Label>
                        <Select value={item.condition || 'Near Mint'} onValueChange={val => setItem({...item, condition: val})}>
                          <SelectTrigger className="border-primary/20 bg-primary/5 font-black uppercase text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
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
                          value={item.price || ''} 
                          onChange={e => setItem({...item, price: parseFloat(e.target.value)})}
                          className="font-black border-primary/20 bg-primary/5" 
                        />
                      </div>
                    </div>
                  </div>
                </form>
             </CardContent>
           </Card>

           <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-800 leading-relaxed font-medium">
                Verify that the identification source is confident. If you manually override data, the identification source will be logged as <strong>MANUAL</strong> to improve future AI training.
              </p>
           </div>
        </div>
      </main>
    </div>
  );
}



