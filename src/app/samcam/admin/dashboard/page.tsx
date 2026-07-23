"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, LayoutDashboard, History, Activity, Database, Trophy, CheckCircle2, AlertCircle, Clock, Zap, Cpu, Gauge
} from "lucide-react";
import { Button } from "@/samcam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/samcam/components/ui/card";
import { Badge } from "@/samcam/components/ui/badge";
import { db } from "@/samcam/lib/firebase";
import { collection, query, orderBy, onSnapshot, limit, where } from "firebase/firestore";
import { CardImport } from "@/samcam/lib/types";
import { cn } from "@/samcam/lib/utils";
import { useAuth } from "@/app/samcam/auth-provider";

export default function EnterpriseDashboard() {
  const [metrics, setMetrics] = useState<CardImport[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "card_imports"), 
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"), 
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMetrics(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardImport)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const stats = {
    total: metrics.length,
    verified: metrics.filter(m => m.status === 'VERIFIED').length,
    pending: metrics.filter(m => m.status === 'NEEDS_REVIEW').length,
    successRate: metrics.length > 0 ? Math.round((metrics.filter(m => m.identificationConfidence && m.identificationConfidence > 0.8).length / metrics.length) * 100) : 0
  };

  return (
    <div className="min-h-screen bg-slate-50 font-mono">
      <header className="flex items-center justify-between p-4 bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild><Link href="/samcam"><ArrowLeft /></Link></Button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Enterprise Lab</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Benched.au v4.5 "Golden Copy"</p>
          </div>
        </div>
        <Badge className="bg-green-500 text-white font-black px-4 py-1 text-[10px]">SYSTEM ONLINE</Badge>
      </header>

      <main className="p-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Captures" value={stats.total} icon={<Database className="w-4 h-4" />} />
          <StatCard title="Success Rate" value={`${stats.successRate}%`} icon={<Zap className="w-4 h-4" />} color="text-yellow-600" />
          <StatCard title="Review Queue" value={stats.pending} icon={<History className="w-4 h-4" />} color="text-blue-600" />
          <StatCard title="Verified" value={stats.verified} icon={<CheckCircle2 className="w-4 h-4" />} color="text-green-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
               <Activity className="w-4 h-4" /> Live Sync Stream
            </h2>
            <div className="space-y-3">
              {metrics.slice(0, 10).map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-primary transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden relative">
                      <img src={item.frontImagePath} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <p className="font-black text-xs uppercase truncate w-48">{item.cardName || 'IDENTIFYING...'}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.identificationSource || 'PENDING'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={cn("text-[8px] font-black uppercase", item.status === 'VERIFIED' ? "bg-green-500" : "bg-blue-500")}>
                      {item.status}
                    </Badge>
                    <p className="text-[8px] font-bold text-slate-300 mt-1 uppercase">{new Date(item.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
             <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">Lab Diagnostics</h2>
             <Card className="border-slate-200 shadow-xl shadow-slate-200/50">
               <CardContent className="pt-6 space-y-6">
                  <DiagItem label="Sensor Model" value="ISOCELL HM3" icon={<Cpu className="w-3.5 h-3.5" />} />
                  <DiagItem label="Shutter Strategy" value="Predictive Peak" icon={<Zap className="w-3.5 h-3.5" />} />
                  <DiagItem label="Filter Logic" value="Kalman Filter" icon={<Gauge className="w-3.5 h-3.5" />} />
                  <DiagItem label="Latency Δ" value="1.2ms" icon={<Clock className="w-3.5 h-3.5" />} />
                  <div className="pt-4 border-t">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-3">Health Profile</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div className="p-3 bg-slate-50 rounded-lg border">
                          <p className="text-[8px] font-black uppercase text-slate-400">Memory</p>
                          <p className="text-xs font-black">244MB</p>
                       </div>
                       <div className="p-3 bg-slate-50 rounded-lg border">
                          <p className="text-[8px] font-black uppercase text-slate-400">FPS Avg</p>
                          <p className="text-xs font-black text-green-500">58.2</p>
                       </div>
                    </div>
                  </div>
               </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, color = "text-slate-800" }: any) {
  return (
    <Card className="border-slate-200 shadow-sm overflow-hidden">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
          <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400">{icon}</div>
        </div>
        <div className={cn("text-2xl font-black font-headline tracking-tighter", color)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function DiagItem({ label, value, icon }: any) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        {icon} {label}
      </div>
      <span className="text-[10px] font-black uppercase text-primary">{value}</span>
    </div>
  );
}