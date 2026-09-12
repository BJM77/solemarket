'use client';

import Link from 'next/link';
import { Sparkles, Zap, Trophy, Flame, Star } from 'lucide-react';

const TRENDING_SEARCHES = [
    { name: 'Jordan 1 High', icon: Flame, href: '/browse?q=Jordan+1+High', color: 'bg-red-100 text-red-600' },
    { name: 'Nike Dunk Low', icon: Zap, href: '/browse?q=Nike+Dunk+Low', color: 'bg-orange-100 text-orange-600' },
    { name: 'Yeezy Boost 350', icon: Star, href: '/browse?q=Yeezy+Boost+350', color: 'bg-gray-100 text-gray-600' },
    { name: 'New Balance 2002R', icon: Trophy, href: '/browse?q=New+Balance+2002R', color: 'bg-green-100 text-green-600' },
    { name: 'Adidas Samba', icon: Sparkles, href: '/browse?q=Adidas+Samba', color: 'bg-blue-100 text-blue-600' },
];

export default function CategoryRail() {
    return (
        <section className="bg-white dark:bg-deep-black border-b border-border/10 overflow-hidden">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10 py-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4 px-2">Trending Searches</h3>
                <div className="flex items-center justify-start gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
                    {TRENDING_SEARCHES.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-muted/30 dark:bg-card hover:bg-white dark:hover:bg-white/5 hover:shadow-premium hover:-translate-y-1 transition-all border border-transparent hover:border-border/50 min-w-[220px]"
                        >
                            <div className={`p-2 rounded-xl ${item.color}`}>
                                <item.icon className="h-5 w-5" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
