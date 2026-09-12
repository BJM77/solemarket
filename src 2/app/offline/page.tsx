'use client';

import React, { useEffect, useState } from 'react';
import { WifiOff, RotateCw, ShoppingBag, Heart, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const handleRetry = () => {
    setIsReconnecting(true);
    setTimeout(() => {
      setIsReconnecting(false);
      if (typeof window !== 'undefined') {
        if (navigator.onLine) {
          window.location.href = '/';
        } else {
          // Toast or message
          alert('Still offline. Please check your network connection.');
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow objects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary opacity-10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 opacity-5 blur-[120px] rounded-full" />

      <div className="relative max-w-md w-full bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[2.5rem] shadow-2xl text-center z-10">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
          <WifiOff className="w-10 h-10 text-rose-500" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight uppercase mb-3 italic">
          Connection <span className="text-primary">Lost.</span>
        </h1>
        <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-8">
          It looks like you've disconnected from the court. Check your internet connection and let's get you back in the game.
        </p>

        <div className="space-y-4 mb-8">
          <Button
            onClick={handleRetry}
            disabled={isReconnecting}
            className="w-full h-14 rounded-2xl text-base font-black uppercase tracking-wider bg-primary hover:bg-orange-600 text-white shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
          >
            <RotateCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
            {isReconnecting ? 'Reconnecting...' : 'Try Reconnecting'}
          </Button>

          {isOnline && (
            <div className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 py-2.5 rounded-xl animate-pulse">
              Connection restored! You are back online.
            </div>
          )}
        </div>

        <div className="border-t border-white/5 pt-6 space-y-3">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Or browse cached pages</p>
          <div className="grid grid-cols-3 gap-2">
            <Link 
              href="/" 
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
            >
              <Home className="w-5 h-5 text-slate-400 group-hover:text-white mb-1 transition-colors" />
              <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Home</span>
            </Link>
            <Link 
              href="/profile/favorites" 
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
            >
              <Heart className="w-5 h-5 text-slate-400 group-hover:text-white mb-1 transition-colors" />
              <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Saved</span>
            </Link>
            <Link 
              href="/profile/orders" 
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
            >
              <ShoppingBag className="w-5 h-5 text-slate-400 group-hover:text-white mb-1 transition-colors" />
              <span className="text-[9px] font-bold text-slate-400 group-hover:text-white uppercase tracking-wider">Purchases</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
