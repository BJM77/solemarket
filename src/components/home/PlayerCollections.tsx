'use client';

import Link from 'next/link';
import { ArrowRight, Star, Zap, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLLECTIONS = [
    {
        id: 'starting-five',
        title: 'The Starting Five',
        description: 'The absolute best in performance basketball. High-tier minutes only.',
        items: [
            { name: 'Kobe Series', count: '42 pairs', color: 'bg-amber-500' },
            { name: 'LeBron Performance', count: '128 pairs', color: 'bg-red-600' },
            { name: 'KD Signature', count: '94 pairs', color: 'bg-blue-500' },
            { name: 'Jordan Retros', count: '312 pairs', color: 'bg-black' },
            { name: 'Kyrie / Irving', count: '56 pairs', color: 'bg-emerald-500' },
        ],
        href: '/browse?collection=starting-five',
        image: 'https://images.unsplash.com/photo-1546514714-df0ccc50d7bf?auto=format&fit=crop&q=80&w=800'
    },
    {
        id: 'sixth-man',
        title: 'Sixth Man Energy',
        description: 'Incredible value. Fresh off the bench and ready to change the game.',
        items: [
            { name: 'GT Cut Series', count: '31 pairs', color: 'bg-pink-500' },
            { name: 'Adidas Harden', count: '88 pairs', color: 'bg-slate-900' },
            { name: 'Puma MB.03', count: '24 pairs', color: 'bg-cyan-400' },
            { name: 'New Balance Two Wxy', count: '15 pairs', color: 'bg-indigo-600' },
            { name: 'Under Armour Curry', count: '45 pairs', color: 'bg-yellow-400' },
        ],
        href: '/browse?collection=sixth-man',
        image: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?auto=format&fit=crop&q=80&w=800'
    }
];

export function PlayerCollections() {
    return (
        <section className="bg-background py-16 lg:py-24">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 mb-4">
                            <Star className="h-3 w-3 text-secondary fill-secondary" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Curated Rotations</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">Season Lineups</h2>
                        <p className="text-muted-foreground mt-3 font-medium max-w-xl">
                            We've scouted the market to bring you the most cohesive collections in the game.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {COLLECTIONS.map((collection) => (
                        <Link 
                            key={collection.id} 
                            href={collection.href}
                            className="group relative overflow-hidden rounded-[2rem] aspect-[16/10] lg:aspect-auto lg:h-[500px]"
                        >
                            <img 
                                src={collection.image} 
                                alt={collection.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            
                            <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter uppercase">
                                    {collection.title}
                                </h3>
                                <p className="text-white/80 text-lg mb-8 max-w-md font-medium leading-relaxed">
                                    {collection.description}
                                </p>
                                
                                <div className="flex flex-wrap gap-3 mb-8">
                                    {collection.items.map((item) => (
                                        <div key={item.name} className="flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
                                            <div className={cn("w-2 h-2 rounded-full", item.color)} />
                                            <span className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider">{item.name}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="inline-flex items-center gap-2 text-secondary font-black text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                                    View Full Roster <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
