'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSiteConfig } from '@/providers/SiteConfigProvider';

export default function HeroModern({ listingCount = 0 }: { listingCount?: number }) {
    const [mounted, setMounted] = useState(false);
    const { config } = useSiteConfig();
    const hero = config.hero;

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <section className="relative flex items-start pt-16 lg:pt-24 pb-8 overflow-hidden">
            <div className="container mx-auto px-6 relative z-10 pt-4">
                <div className="max-w-4xl mx-auto text-center">

                    {/* H1 for SEO & Accessibility */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 md:mb-6 leading-[0.9] slide-up">
                        {hero.h1TitleLine1 || "AUSTRALIA'S PREMIER"} <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-500">
                            {hero.h1TitleLine2 || 'MARKETPLACE.'}
                        </span>
                    </h1>

                    <div className="text-sm md:text-xl text-slate-600 dark:text-slate-400 mb-8 md:mb-10 max-w-2xl mx-auto font-medium slide-up space-y-1.5 md:space-y-2" style={{ animationDelay: '0.2s' }}>
                        <p className="text-slate-900 dark:text-white">{hero.subText1}</p>
                        <p className="text-primary font-black">{hero.subText2}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 slide-up mb-12 md:mb-16" style={{ animationDelay: '0.3s' }}>
                        {hero.buttons && hero.buttons.map((btn) => (
                            <Link 
                                key={btn.id}
                                href={btn.href} 
                                style={{ backgroundColor: btn.bgColor, color: btn.textColor }}
                                className="w-full sm:w-auto px-8 py-4 md:px-10 md:py-5 rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(242,108,13,0.4)] flex items-center justify-center gap-2 text-sm md:text-base"
                            >
                                {btn.label}
                            </Link>
                        ))}
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
