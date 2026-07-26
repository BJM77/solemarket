"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Trash2,
  Send,
  Edit2,
  Loader2,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/samcam/lib/utils";
import { useAuth } from "../auth-provider";
import { ProImport } from "@/procam/lib/types";
import { db } from "@/samcam/lib/firebase";
import { collection, doc, deleteDoc, addDoc, updateDoc } from "firebase/firestore";
import { useToast } from "@/samcam/hooks/use-toast";

export default function ProReviewQueue() {
  const { user, imports, importsLoading: loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFIED' | 'NEEDS_REVIEW'>('ALL');
  const [actionId, setActionId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const allCount = imports.length;
  const verifiedCount = imports.filter(i => i.status === 'VERIFIED').length;
  const incompleteCount = imports.filter(i => i.status === 'NEEDS_REVIEW').length;

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product capture?")) return;
    setActionId(id);
    try {
      await deleteDoc(doc(db, "pro_imports", id));
      toast({ title: "Product Deleted", description: "Product capture queue item removed successfully." });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Delete Failed", description: err.message || "Failed to delete product." });
    } finally {
      setActionId(null);
    }
  };

  const handleSubmit = async (item: ProImport) => {
    setActionId(item.id);
    try {
      await addDoc(collection(db, "products"), {
        title: item.title || 'Other Collectible Product',
        price: item.price || 0,
        description: item.description || '',
        imageUrls: [item.mainImagePath, item.secondaryImagePath].filter(Boolean),
        sellerId: user?.uid || 'anonymous',
        status: 'available',
        category: 'Other Stuff',
        condition: item.condition || 'New',
        quantity: 1,
        createdAt: Date.now(),
        isDraft: false,
        specs: {
          title: item.title || '',
          brand: item.brand || '',
          model: item.model || '',
          condition: item.condition || '',
          category: item.category || 'Other Stuff',
          year: item.year || '',
        }
      });

      await updateDoc(doc(db, "pro_imports", item.id), {
        status: 'VERIFIED',
        updatedAt: Date.now()
      });

      toast({ title: "Product Submitted", description: "Successfully promoted and listed on the marketplace!" });
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Submit Failed", description: err.message || "Failed to submit product." });
    } finally {
      setActionId(null);
    }
  };

  const filtered = imports.filter(i => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      (i.title?.toLowerCase().includes(term) || false) ||
      (i.brand?.toLowerCase().includes(term) || false) ||
      (i.model?.toLowerCase().includes(term) || false) ||
      (i.id?.toLowerCase().includes(term) || false);

    if (activeTab === 'ALL') return matchesSearch;
    return matchesSearch && i.status === activeTab;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between p-4 bg-zinc-900 border-b border-white/10 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/procam')} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-black uppercase font-headline tracking-tighter">Review Queue</h1>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Product Verification Workspace</p>
          </div>
        </div>
        <Badge className="bg-primary text-black font-black px-5 py-1 text-[10px] tracking-widest">{imports.length} ITEMS</Badge>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Search title, brand, model..." 
              className="pl-12 bg-zinc-900 h-12 font-medium border-white/10 shadow-sm text-white focus:ring-primary"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="bg-zinc-900 border-white/10 text-white gap-2 font-black uppercase text-[10px] px-6 h-12 hover:bg-zinc-800">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        {/* Status filtering Tabs */}
        <div className="flex border-b border-white/10 mb-8 overflow-x-auto gap-6 text-[10px] font-black uppercase tracking-wider">
          <button 
            onClick={() => setActiveTab('ALL')}
            className={cn(
              "pb-3.5 border-b-2 px-1 transition-all flex items-center gap-1.5",
              activeTab === 'ALL' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            All Items <span className="bg-zinc-800 text-zinc-400 rounded px-1.5 py-0.5 text-[8px]">{allCount}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('VERIFIED')}
            className={cn(
              "pb-3.5 border-b-2 px-1 transition-all flex items-center gap-1.5",
              activeTab === 'VERIFIED' ? "border-green-500 text-green-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Verified <span className="bg-green-950/40 text-green-400 rounded px-1.5 py-0.5 text-[8px]">{verifiedCount}</span>
          </button>

          <button 
            onClick={() => setActiveTab('NEEDS_REVIEW')}
            className={cn(
              "pb-3.5 border-b-2 px-1 transition-all flex items-center gap-1.5",
              activeTab === 'NEEDS_REVIEW' ? "border-primary text-primary" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Incomplete <span className="bg-orange-950/40 text-orange-400 rounded px-1.5 py-0.5 text-[8px]">{incompleteCount}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item: ProImport) => (
            <Card key={item.id} className="overflow-hidden group hover:border-primary/50 hover:shadow-glow transition-all bg-zinc-900 border-white/10 text-white">
               <div className="aspect-square relative bg-zinc-950 overflow-hidden rounded-t-xl">
                 <img src={item.mainImagePath} className="w-full h-full object-cover transition-transform group-hover:scale-105 animate-fade-in" alt="main view" />
                 
                 <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                   <Badge className={cn("text-[8px] font-black uppercase gap-1 px-2 border-none", 
                      item.status === 'VERIFIED' ? "bg-green-600 text-white" : 
                      item.status === 'NEEDS_REVIEW' ? "bg-primary text-black" : 
                      "bg-blue-600 text-white"
                   )}>
                     {item.status === 'VERIFIED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                     {item.status}
                   </Badge>
                 </div>
               </div>
               <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="font-black text-xs truncate uppercase tracking-tight text-white">
                      {item.title || 'Pending Identification'}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 mt-1 uppercase tracking-widest">
                      {item.brand || 'No Brand'} {item.year ? `• Year ${item.year}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 gap-2">
                    <div className="text-[9px] font-black text-zinc-650 uppercase">
                      ID: {item.id.substring(0,8)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button 
                        size="icon" 
                        variant="destructive"
                        className="h-8 w-8 hover:bg-red-600 bg-zinc-800 text-red-400 hover:text-white"
                        onClick={() => handleDelete(item.id)}
                        disabled={actionId === item.id}
                      >
                        {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline"
                        className="h-8 w-8 border-white/10 text-white hover:bg-zinc-800"
                        onClick={() => router.push(`/procam/review/${item.id}`)}
                        disabled={actionId === item.id}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase bg-primary text-black hover:bg-primary/90"
                        onClick={() => handleSubmit(item)}
                        disabled={actionId === item.id || item.status === 'VERIFIED'}
                      >
                        {actionId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                        Submit
                      </Button>
                    </div>
                  </div>
               </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center">
               <div className="bg-zinc-900 p-10 rounded-full inline-block mb-6 ring-8 ring-zinc-955">
                 <Layers className="w-16 h-16 text-zinc-600" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight text-white">Queue Depleted</h3>
               <p className="text-xs text-zinc-400 font-medium mt-2">Active booth session required to populate workspace.</p>
               <Button className="mt-8 font-black uppercase tracking-widest px-10 h-12 bg-primary text-black hover:bg-primary/95" onClick={() => router.push('/procam/capture')}>Open Booth</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
