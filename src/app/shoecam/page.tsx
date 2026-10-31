"use client";

import { useState, useEffect } from "react";
import { 
  Camera, 
  LayoutDashboard, 
  History, 
  Settings, 
  ArrowRight,
  PlusCircle,
  Database,
  CloudUpload,
  Footprints,
  ScanBarcode,
  Loader,
  User as UserIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/samcam/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

export default function ShoeCamDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({ pending: 0, inventory: 0, live: 0 });
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "shoe_imports"), 
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      const filteredCount = docs.filter(d => d.userId === user.uid || d.userId === 'anonymous').length;
      setStats(prev => ({ ...prev, pending: filteredCount }));
    });

    return () => unsubscribe();
  }, [user]);

  if (!mounted || authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-primary p-1.5 rounded-lg">
            <Footprints className="w-6 h-6 text-black" />
          </div>
          <h1 className="text-xl font-bold font-headline tracking-tight uppercase text-foreground">
            SHOECAM<span className="text-primary">.AU</span>
          </h1>
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex bg-muted rounded-full px-4 py-1.5 items-center gap-2 border border-border">
             <div className="w-2 h-2 rounded-full bg-green-700 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Shoe Booth Connected</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => router.push('/shoecam/settings')} className="text-muted-foreground hover:text-foreground hover:bg-muted">
             <Settings className="w-5 h-5" />
          </Button>
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-foreground/80">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="flex-grow p-4 md:p-8 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
           <Card className="bg-primary text-primary-foreground border-none shadow-glow overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Camera className="w-20 h-20" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black flex items-center gap-2 uppercase tracking-widest opacity-80 text-black">
                Shoe Studio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black font-headline uppercase mb-4 text-black">Launch Booth</div>
              <Button variant="secondary" className="w-full bg-background text-primary hover:bg-card font-black uppercase text-xs border-none" onClick={() => router.push('/shoecam/capture')}>
                Open Scanner <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                <History className="w-4 h-4" />
                Review Queue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-foreground">{stats.pending}</div>
              <p className="text-[9px] text-muted-foreground mt-1 font-black uppercase tracking-widest">Shoes to verify</p>
              <Button variant="link" className="p-0 h-auto text-[10px] font-black uppercase mt-4 text-primary animate-pulse" onClick={() => router.push('/shoecam/review')}>
                Open Workspace <ArrowRight className="ml-1 w-3 h-3" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                <Database className="w-4 h-4" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-foreground">{stats.inventory}</div>
              <p className="text-[9px] text-muted-foreground mt-1 font-black uppercase tracking-widest">Verified Items</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border text-foreground shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-[10px] font-black text-muted-foreground flex items-center gap-2 uppercase tracking-widest">
                <CloudUpload className="w-4 h-4" />
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black font-headline text-foreground">{stats.live}</div>
              <p className="text-[9px] text-muted-foreground mt-1 font-black uppercase tracking-widest">Live Listings</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-headline flex items-center gap-2 uppercase tracking-tight text-foreground">
                <LayoutDashboard className="w-5 h-5 text-primary" />
                Capture Workflow
              </h2>
            </div>
            
            <Card className="min-h-[300px] flex flex-col items-center justify-center text-center p-8 bg-card border-dashed border-2 border-border text-foreground">
              <div className="bg-muted p-6 rounded-full mb-4 ring-8 ring-zinc-800/40">
                <ScanBarcode className="w-10 h-10 text-zinc-600" />
              </div>
              <h3 className="text-lg font-black uppercase tracking-tighter text-foreground">Ready for Shoe Batch</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-2 font-medium">
                High-resolution raw capture of 4 angles (Front 45°, Side, Top, and Tag Label) with background cloud sync and Gemini auto-identification.
              </p>
              <Button className="mt-8 px-10 font-black uppercase tracking-widest h-12 bg-primary text-primary-foreground hover:bg-primary/95" variant="default" onClick={() => router.push('/shoecam/capture')}>
                <PlusCircle className="mr-2 w-5 h-5" />
                Begin Session
              </Button>
            </Card>
          </div>

          <div className="space-y-6">
            <h2 className="text-xl font-black font-headline uppercase tracking-tight text-foreground">Cloud Link</h2>
            <Card className="bg-card border-border text-foreground">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Storage:</span>
                  <span className="text-[10px] text-primary font-black uppercase">Firebase Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Auto-Shutter:</span>
                  <Badge className="bg-yellow-500/10 text-yellow-600 border-none text-[8px] font-black uppercase">Active</Badge>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Matching:</span>
                  <Badge variant="outline" className="bg-muted text-foreground/80 border-border text-[8px] font-black uppercase tracking-widest">TAG-SCAN v1</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
