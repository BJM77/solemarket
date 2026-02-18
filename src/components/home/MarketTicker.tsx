'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp } from 'lucide-react';

import Link from 'next/link';

const MOCK_SALES = [
    { model: 'Kobe 6 Protro "Reverse Grinch"', price: '$850', time: '2m ago', type: 'kicks' },
    { model: 'Panini Prizm Victor Wembanyama', price: '$4,200', time: '8m ago', type: 'cards' },
    { model: 'Jordan 1 Retro High OG "Chicago"', price: '$1,200', time: '15m ago', type: 'kicks' },
    { model: 'Charizard 1st Edition PSA 10', price: '$12,500', time: '22m ago', type: 'cards' },
    { model: 'LeBron 20 "Time Machine"', price: '$320', time: '34m ago', type: 'kicks' },
    { model: 'AE1 "With Love"', price: '$280', time: '1h ago', type: 'kicks' },
    { model: 'Upper Deck Michael Jordan MJ', price: '$890', time: '1h ago', type: 'cards' },
    { model: 'Jordan 4 Retro "Military Blue"', price: '$450', time: '6h ago', type: 'kicks' },
];

export function MarketTicker() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return (
        <div className="w-full bg-slate-900 text-white py-2 overflow-hidden border-y border-white/5 relative z-50">
            <div className="flex animate-marquee whitespace-nowrap hover:[animation-play-state:paused]">
                {[...MOCK_SALES, ...MOCK_SALES].map((sale, i) => (
                    <Link 
                        key={i} 
                        href={`/browse?q=${encodeURIComponent(sale.model)}`}
                        className="flex items-center gap-4 px-8 border-r border-white/10 hover:bg-white/5 transition-colors group"
                    >
                        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary group-hover:text-white transition-colors">
                            <TrendingUp className="h-3 w-3" />
                            {sale.type === 'cards' ? 'Sold Box' : 'Checked In'}
                        </span>
                        <span className="text-xs font-bold uppercase tracking-tight group-hover:underline underline-offset-4 decoration-primary">{sale.model}</span>
                        <span className="text-xs font-black text-primary">{sale.price}</span>
                        <span className="text-[10px] text-white/40 font-medium">{sale.time}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
