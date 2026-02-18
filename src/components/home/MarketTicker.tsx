'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

const MOCK_SALES = [
    { model: 'Kobe 6 Protro "Reverse Grinch"', price: '$850', time: '2m ago' },
    { model: 'Jordan 1 Retro High OG "Chicago"', price: '$1,200', time: '15m ago' },
    { model: 'LeBron 20 "Time Machine"', price: '$320', time: '34m ago' },
    { model: 'AE1 "With Love"', price: '$280', time: '1h ago' },
    { model: 'KD 16 "Aunt Pearl"', price: '$240', time: '2h ago' },
    { model: 'GT Cut 3 "All-Star"', price: '$290', time: '3h ago' },
    { model: 'Sabrina 1 "Ionic"', price: '$190', time: '5h ago' },
    { model: 'Jordan 4 Retro "Military Blue"', price: '$450', time: '6h ago' },
];

export function MarketTicker() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <div className="w-full bg-primary text-white py-2 overflow-hidden border-y border-white/5 relative z-50">
            <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused] cursor-pointer">
                {[...MOCK_SALES, ...MOCK_SALES].map((sale, i) => (
                    <div key={i} className="flex items-center gap-4 px-8 border-r border-white/10">
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-secondary">
                            <TrendingUp className="h-3 w-3" />
                            Checked In
                        </span>
                        <span className="text-xs font-bold uppercase tracking-tight">{sale.model}</span>
                        <span className="text-xs font-black text-secondary">{sale.price}</span>
                        <span className="text-[10px] text-white/40 font-medium">{sale.time}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
