"use client";

import Link from 'next/link';
import { 
    ArrowRight, 
    Coins, 
    Globe, 
    Flame, 
    Circle, 
    Package, 
    Banknote, 
    AlertTriangle, 
    ShieldCheck, 
    Box 
} from 'lucide-react';
import { cn } from "@/lib/utils";

const COIN_CATEGORIES = [
    {
        name: 'Australian Coins',
        icon: Coins,
        href: '/coins?subCategory=Australian+Coins',
    },
    {
        name: 'World Coins',
        icon: Globe,
        href: '/coins?subCategory=World+Coins',
    },
    {
        name: 'Gold',
        icon: Flame,
        href: '/coins?subCategory=Gold',
    },
    {
        name: 'Silver',
        icon: Circle,
        href: '/coins?subCategory=Silver',
    },
    {
        name: 'Proof Sets',
        icon: Box,
        href: '/coins?subCategory=Proof+Sets',
    },
    {
        name: 'Banknotes',
        icon: Banknote,
        href: '/coins?subCategory=Banknotes',
    },
    {
        name: 'Error Coins',
        icon: AlertTriangle,
        href: '/coins?subCategory=Error+Coins',
    },
    {
        name: 'Graded',
        icon: ShieldCheck,
        href: '/coins?subCategory=Graded',
    },
    {
        name: 'Bulk Lots',
        icon: Package,
        href: '/coins?subCategory=Other',
    },
    {
        name: 'View All',
        icon: ArrowRight,
        href: '/coins',
    },
];

export default function CoinCategoryGrid() {
    return (
        <section className="bg-black py-16 lg:py-24 border-b border-white/5 relative overflow-hidden">
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between mb-8 md:mb-12 gap-3 md:gap-4">
                    <div>
                        <h2 className="text-2xl md:text-5xl font-black text-white tracking-tighter uppercase italic">The Vault</h2>
                        <p className="text-xs md:text-lg text-muted-foreground mt-1 md:mt-2 font-medium">Rare Australian pennies, gold bullion, and graded numismatics.</p>
                    </div>
                    <Link href="/coins" className="group hidden md:flex text-sm font-black tracking-widest uppercase text-yellow-500 items-center transition-all bg-yellow-500/10 px-6 py-3 rounded-full hover:bg-yellow-500/20">
                        View All Coins <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
                    {COIN_CATEGORIES.map((cat) => {
                        const IconComponent = cat.icon;
                        return (
                            <Link
                                key={cat.name}
                                href={cat.href}
                                className="group block"
                            >
                                <div className="relative h-full bg-zinc-900/50 border border-white/5 rounded-2xl md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center gap-3 md:gap-6 transition-all duration-500 hover:border-yellow-500/50 hover:shadow-[0_0_40px_rgba(234,179,8,0.15)] hover:-translate-y-2 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                    <div className={cn(
                                        "relative w-12 h-12 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-black border border-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                    )}>
                                        <IconComponent className="h-6 w-6 md:h-8 md:w-8 text-yellow-500" />
                                    </div>
                                    <span className="font-black text-white text-[10px] md:text-sm uppercase tracking-widest text-center relative z-10">
                                        {cat.name}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <Link href="/coins" className="mt-6 md:mt-8 md:hidden group text-xs md:text-sm font-black tracking-widest uppercase text-yellow-500 flex justify-center items-center transition-all bg-yellow-500/10 px-4 py-3 md:px-6 md:py-4 rounded-full hover:bg-yellow-500/20 w-full text-center">
                    View All Coins <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}
