'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Advertisement } from '@/lib/types';
import { getActiveAd, trackAdImpression, trackAdClick } from '@/services/ad-service';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';

interface AdUnitProps {
    placement: Advertisement['placement'];
    className?: string;
    variant?: 'banner' | 'card';
}

export function AdUnit({ placement, className, variant = 'banner' }: AdUnitProps) {
    const [ad, setAd] = useState<Advertisement | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const fetchAd = async () => {
            const fetchedAd = await getActiveAd(placement);
            if (fetchedAd) {
                setAd(fetchedAd);
                trackAdImpression(fetchedAd.id);
                setIsVisible(true);
            }
        };
        fetchAd();
    }, [placement]);

    if (!ad || !isVisible) return null;

    const handleClick = () => {
        trackAdClick(ad.id);
        window.open(ad.linkUrl, '_blank', 'noopener,noreferrer');
    };

    if (variant === 'card') {
        return (
            <div 
                className={cn(
                    "group relative overflow-hidden rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 cursor-pointer shadow-sm hover:shadow-md transition-all",
                    className
                )}
                onClick={handleClick}
            >
                <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-uppercase tracking-widest">
                    SPONSORED
                </div>
                <div className="relative aspect-[4/3] w-full bg-gray-50 dark:bg-gray-800">
                    <Image 
                        src={ad.imageUrl} 
                        alt={ad.title} 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                </div>
                <div className="p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">{ad.advertiserName}</p>
                    <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{ad.title}</h3>
                    <div className="mt-3 text-sm font-bold text-primary flex items-center gap-1">
                        Learn More <ExternalLink className="w-3 h-3" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={cn(
                "relative w-full overflow-hidden rounded-xl cursor-pointer group",
                className
            )}
            onClick={handleClick}
        >
            <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded text-uppercase tracking-widest">
                AD
            </div>
            <div className="relative w-full h-full min-h-[120px]">
                <Image 
                    src={ad.imageUrl} 
                    alt={ad.title} 
                    fill 
                    className="object-cover group-hover:brightness-95 transition-all"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-6 flex flex-col justify-center">
                    <p className="text-xs font-bold text-white/80 uppercase mb-1">{ad.advertiserName}</p>
                    <h3 className="text-xl md:text-2xl font-black text-white max-w-md leading-none mb-2">{ad.title}</h3>
                    <button className="bg-white text-black px-4 py-1.5 rounded-full text-xs font-bold w-fit mt-2 hover:bg-gray-100 transition-colors">
                        Check it out
                    </button>
                </div>
            </div>
        </div>
    );
}
