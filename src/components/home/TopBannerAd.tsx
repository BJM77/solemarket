'use client';

import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Advertisement } from '@/lib/types';
import Link from 'next/link';

export default function TopBannerAd() {
    const q = useMemoFirebase(() => query(
        collection(db, 'ads'),
        where('placement', '==', 'home_top_banner'),
        where('status', '==', 'active'),
        limit(1)
    ), []);
    
    const { data: ads, isLoading } = useCollection<Advertisement>(q);

    if (isLoading || !ads || ads.length === 0) {
        return null; // Return null if no active ad or loading to prevent layout shift with empty space
    }

    const activeAd = ads[0];

    return (
        <div className="w-full bg-slate-900 overflow-hidden relative group cursor-pointer block shadow-sm border-b border-white/5 h-12 sm:h-16">
            <Link href={activeAd.linkUrl || '#'} className="absolute inset-0 z-10 block" />
            <img 
                src={activeAd.imageUrl} 
                alt={activeAd.title} 
                className="w-full h-full object-cover object-center" 
            />
            {/* Optional Advertisement badge overlay */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20 pointer-events-none hidden sm:block">
                <span className="bg-primary/90 backdrop-blur-sm text-white text-[10px] md:text-xs font-black uppercase px-2 py-0.5 rounded-sm tracking-wider shadow-sm">
                    Advertisement
                </span>
            </div>
        </div>
    );
}
