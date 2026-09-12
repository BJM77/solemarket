'use client';

import Link from 'next/link';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const VAULT_ITEMS = [
    {
        id: 'psa-10-gem-mint',
        title: 'PSA 10 Gem Mint',
        description: 'Immaculate condition. The pinnacle of collecting and investing.',
        items: [
            { name: 'Michael Jordan', count: '12 available', color: 'bg-red-600' },
            { name: 'LeBron James', count: '34 available', color: 'bg-purple-600' },
            { name: 'Victor Wembanyama', count: '8 available', color: 'bg-teal-500' },
        ],
        href: '/cards?grade=PSA10',
        image: 'https://images.unsplash.com/photo-1621811693633-91ee0a76a591?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: 'rare-autos',
        title: 'Signed & Certified',
        description: 'Autographed memorabilia and on-card signatures from the legends.',
        items: [
            { name: 'Kobe Bryant', count: '4 available', color: 'bg-amber-500' },
            { name: 'Stephen Curry', count: '18 available', color: 'bg-blue-600' },
            { name: 'Luka Doncic', count: '22 available', color: 'bg-indigo-500' },
        ],
        href: '/cards?type=Autograph',
        image: 'https://images.unsplash.com/photo-1542157140-1014cc679469?auto=format&fit=crop&q=80&w=800'
    }
];

export function PlayerCollections() {
    return (
        <section className="bg-background py-16 lg:py-24 relative overflow-hidden">
            <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-slate-800/20 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4 backdrop-blur-sm">
                            <Lock className="h-3 w-3 text-slate-300" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">The Vault</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic">Premium Graded</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium max-w-xl">
                            Investment-grade basketball cards, authenticated and secured. Verified authentic by industry leaders.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {VAULT_ITEMS.map((collection) => (
                        <Link
                            key={collection.id}
                            href={collection.href}
                            className="group relative overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/5 aspect-[16/10] lg:aspect-auto lg:h-[450px] transition-all duration-500 hover:border-slate-500/30 hover:shadow-2xl"
                        >
                            <img
                                src={collection.image}
                                alt={collection.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 dark:opacity-40 grayscale group-hover:grayscale-0"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent dark:from-black dark:via-black/60" />

                            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase relative z-10">
                                    {collection.title}
                                </h3>
                                <p className="text-slate-300 text-sm md:text-lg mb-8 max-w-md font-medium leading-relaxed relative z-10">
                                    {collection.description}
                                </p>

                                <div className="flex flex-wrap gap-2 md:gap-3 mb-8 relative z-10">
                                    {collection.items.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-3 md:px-4 py-2 rounded-xl">
                                            <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                            <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider">{item.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="inline-flex items-center gap-2 text-white font-black text-xs md:text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform relative z-10">
                                    Open The Vault <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
