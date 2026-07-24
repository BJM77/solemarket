
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Camera, 
  LayoutDashboard, 
  History, 
  Settings, 
  ArrowRight,
  PlusCircle,
  Database,
  CloudUpload,
  Trophy,
  ScanBarcode,
  Loader,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/samcam/components/ui/card";
import { Badge } from "@/samcam/components/ui/badge";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";
import { db } from "@/samcam/lib/firebase";
import { collection, query, onSnapshot, orderBy, where } from "firebase/firestore";

export default function BenchedDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ pending: 0, inventory: 0, live: 0 });
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "card_imports"), 
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const filteredCount = docs.filter(d => d.userId === user.uid || d.userId === 'anonymous').length;
      setStats(prev => ({ ...prev, pending: filteredCount }));
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-zinc-900 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Trophy className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold font-headline tracking-tight uppercase text-white">
            BENCHED<span className="text-primary">.AU</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-zinc-800 rounded-full px-4 py-1.5 items-center gap-2 border border-white/5">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Booth Connected</span>
          </div>
          <Button variant="ghost" size="icon" asChild className="text-zinc-400 hover:text-white hover:bg-zinc-800">
             <Link href="/samcam/settings"><Settings className="w-5 h-5" /></Link>
          </Button>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-300">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <Card className="bg-primary text-black border-none shadow-glow overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Camera className="w-20 h-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest opacity-80 text-black">
                Studio View
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black font-headline uppercase mb-4 text-black">Launch Booth</div>
              <Button variant="secondary" className="w-full bg-black text-primary hover:bg-zinc-900 font-black uppercase text-xs border-none" asChild>
                <Link href="/samcam/capture">
                  Open Scanner <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/10 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                <History className="w-4 h-4" />
                Review Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-white">{stats.pending}</div>
              <p className="text-[9px] text-zinc-500 mt-1 font-black uppercase tracking-widest">Items to verify</p>
              <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase mt-4 text-primary" asChild>
                <Link href="/samcam/review">Open Workspace <ArrowRight className="ml-1 w-3 h-3" /></Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/10 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                <Database className="w-4 h-4" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-white">{stats.inventory}</div>
              <p className="text-[9px] text-zinc-500 mt-1 font-black uppercase tracking-widest">Verified Items</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-white/10 text-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
                <CloudUpload className="w-4 h-4" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-white">{stats.live}</div>
              <p className="text-[9px] text-zinc-500 mt-1 font-black uppercase tracking-widest">Live Listings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-headline flex items-center gap-2 uppercase tracking-tight text-white">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                Capture Workflow
              </h2>
            </div>
            
            <Card className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-zinc-900 border-dashed border-2 border-white/10 text-white">
              <div className="bg-zinc-800 p-6 rounded-full mb-4 ring-8 ring-zinc-800/40">
                <ScanBarcode className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter text-white">Ready for New Batch</h3>
              <p className="text-xs text-zinc-400 max-w-xs mt-2 font-medium">
                High-resolution raw capture with background cloud sync and ML Kit document identification.
              </p>
              <Button className="mt-8 px-10 font-black uppercase tracking-widest h-12 bg-primary text-black hover:bg-primary/95" variant="default" asChild>
                <Link href="/samcam/capture">
                  <PlusCircle className="mr-2 w-5 h-5" />
                  Begin Session
                </Link>
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-black font-headline uppercase tracking-tight text-white">Cloud Link</h2>
            <Card className="bg-zinc-900 border-white/10 text-white">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Storage:</span>
                  <span className="text-[10px] text-primary font-black uppercase">Firebase Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Auto-Shutter:</span>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-none text-[8px] font-black uppercase">Active</Badge>
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Matching:</span>
                  <Badge variant="outline" className="bg-zinc-800 text-zinc-300 border-white/10 text-[8px] font-black uppercase tracking-widest">DB-FIRST v2</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
