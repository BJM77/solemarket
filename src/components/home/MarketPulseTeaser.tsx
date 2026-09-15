import React from 'react';
import Link from 'next/link';
import { Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketPulseTeaser() {
    return (
        <section className="py-16 bg-black border-t border-white/5 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
            
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-white/5 border border-white/10 p-8 rounded-2xl">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-widest">
                            <Activity className="h-3 w-3" /> Live Market Data
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter">
                            Check the <span className="text-emerald-500">Market Pulse</span>
                        </h2>
                        <p className="text-muted-foreground max-w-xl text-lg">
                            Track real-time prices, volume, and the Vault-verified premium for the hottest sneakers, cards, and coins in Australia.
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0">
                        <Link href="/market-pulse">
                            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-8 h-14 rounded-full uppercase tracking-wider">
                                View Pulse Index &rarr;
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
