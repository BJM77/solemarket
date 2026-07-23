"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Filter,
  Gem,
  Database
} from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Input } from "@/samcam/components/ui/input";
import { Card, CardContent } from "@/samcam/components/ui/card";
import { Badge } from "@/samcam/components/ui/badge";
import { db } from "@/samcam/lib/firebase";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { CardImport } from "@/samcam/lib/types";
import { cn } from "@/samcam/lib/utils";
import { useAuth } from "@/app/samcam/auth-provider";

export default function ReviewQueue() {
  const { user } = useAuth();
  const [imports, setImports] = useState<CardImport[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "card_imports"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardImport));
      setImports(docs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const filtered = imports.filter(i => 
    i.cardName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.gradedCertNumber?.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-black uppercase font-headline tracking-tighter">Review Queue</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Verification Workspace</p>
          </div>
        </div>
        <Badge className="bg-primary text-white font-black px-5 py-1 text-[10px] tracking-widest">{imports.length} ITEMS</Badge>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Search certs, players, or batches..." 
              className="pl-12 bg-white h-12 font-medium border-slate-200 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="bg-white gap-2 font-black uppercase text-[10px] px-6 h-12">
            <Filter className="w-4 h-4" /> Filters
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden group hover:border-primary/50 hover:shadow-xl transition-all bg-white border-slate-200">
               <div className="aspect-[2.5/3.5] relative bg-slate-100 overflow-hidden">
                 <img src={item.frontImagePath} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="front" />
                 
                 <div className="absolute top-2 left-2 flex flex-col gap-1.5">
                   <Badge className={cn("text-[8px] font-black uppercase gap-1 px-2", 
                     item.status === 'VERIFIED' ? "bg-green-500" : "bg-blue-500"
                   )}>
                     {item.status === 'VERIFIED' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                     {item.status}
                   </Badge>
                   {item.identificationSource && (
                      <Badge variant="outline" className="bg-white/90 text-[8px] font-black uppercase gap-1 px-2 border-none">
                        {item.identificationSource === 'DATABASE_MATCH' ? <Database className="w-2.5 h-2.5 text-primary" /> : <Gem className="w-2.5 h-2.5 text-primary" />}
                        {item.identificationSource}
                      </Badge>
                   )}
                 </div>
               </div>
               <CardContent className="p-5">
                  <div className="mb-4">
                    <h3 className="font-black text-xs truncate uppercase tracking-tight text-slate-800">
                      {item.cardName || 'Pending Identification'}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                      {item.setName || 'Batch ' + new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  {item.identificationConfidence && (
                    <div className="flex flex-col gap-1 mb-4">
                       <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                         <span>Match Confidence</span>
                         <span>{Math.round(item.identificationConfidence * 100)}%</span>
                       </div>
                       <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${item.identificationConfidence * 100}%` }} />
                       </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <div className="text-[9px] font-black text-slate-300 uppercase">
                      ID: {item.id.substring(0,8)}
                    </div>
                    <Button size="sm" className="h-8 text-[10px] font-black uppercase bg-slate-900 text-white hover:bg-primary transition-colors" onClick={() => router.push(`/review/${item.id}`)}>
                      Verify <ExternalLink className="ml-2 w-3.5 h-3.5" />
                    </Button>
                  </div>
               </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && !loading && (
            <div className="col-span-full py-24 text-center">
               <div className="bg-slate-100 p-10 rounded-full inline-block mb-6 ring-8 ring-slate-50">
                 <AlertCircle className="w-16 h-16 text-slate-300" />
               </div>
               <h3 className="text-xl font-black uppercase tracking-tight">Queue Depleted</h3>
               <p className="text-xs text-muted-foreground font-medium mt-2">Active booth session required to populate workspace.</p>
               <Button className="mt-8 font-black uppercase tracking-widest px-10 h-12" onClick={() => router.push('/capture')}>Open Booth</Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
