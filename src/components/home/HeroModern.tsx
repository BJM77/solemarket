'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroModern({ listingCount = 0 }: { listingCount?: number }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="relative flex items-start pt-16 lg:pt-24 pb-8 overflow-hidden">
            <div className="container mx-auto px-6 relative z-10 pt-4">
                <div className="max-w-4xl mx-auto text-center">

                    {/* H1 for SEO & Accessibility */}
                    <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 md:mb-6 leading-[0.9] slide-up">
                        AUSTRALIA'S PREMIER <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">MARKETPLACE.</span>
                    </h1>

                    <div className="text-sm md:text-xl text-slate-600 dark:text-slate-400 mb-8 md:mb-10 max-w-2xl mx-auto font-medium slide-up space-y-1.5 md:space-y-2" style={{ animationDelay: '0.2s' }}>
                        <p className="text-slate-900 dark:text-white">Buy Footwear, Collector Cards and Australian Coins & Notes.</p>
                        <p className="text-primary font-black">Metro Perth Collection or Express Freight Solutions Available</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 slide-up mb-12 md:mb-16" style={{ animationDelay: '0.3s' }}>
                        <Link href="/shoes" className="w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 bg-primary hover:bg-orange-600 text-white rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(242,108,13,0.4)] flex items-center justify-center gap-2 text-sm md:text-base">
                            Shop Sneakers
                        </Link>
                        <Link href="/cards" className="w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 border border-slate-900 dark:border-white rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 text-center text-sm md:text-base">
                            Shop Cards
                        </Link>
                        <Link href="/coins" className="w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(202,138,4,0.4)] text-center text-sm md:text-base">
                            Shop Coins
                        </Link>
                    </div>

                    {/* Metrics Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto slide-up pt-6 md:pt-8 border-t border-slate-200 dark:border-white/10" style={{ animationDelay: '0.4s' }}>
                        <div className="text-center">
                            <div className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5 md:mb-1">Local</div>
                            <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Verified Auth</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5 md:mb-1">Community</div>
                            <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Peer-to-Peer</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-3xl font-black text-primary mb-0.5 md:mb-1">{mounted ? listingCount.toLocaleString() : '...'}</div>
                            <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Active Listings</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl md:text-3xl font-black text-slate-900 dark:text-white mb-0.5 md:mb-1">0%</div>
                            <div className="text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-widest">Selling Fees</div>
                        </div>
                    </div>
                </div>
            </div>

        </section>
    );
}
