"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Library, Trophy, Zap, Sparkles, Flag, PenTool as Signature, Medal } from 'lucide-react';
import { cn } from "@/lib/utils";

const CARD_CATEGORIES = [
    {
        name: 'Jordan',
        logo: '/brand-logos/svg/jordan.svg',
        href: '/cards?subCategory=Jordan',
        color: 'bg-red-50/50 dark:bg-red-950/10'
    },
    {
        name: 'Kobe',
        logo: '/brand-logos/svg/kobe.svg',
        href: '/cards?subCategory=Kobe',
        color: 'bg-purple-50/50 dark:bg-purple-950/10'
    },
    {
        name: 'Curry',
        logo: '/brand-logos/svg/curry.svg',
        href: '/cards?subCategory=Curry',
        color: 'bg-blue-50/50 dark:bg-blue-950/10'
    },
    {
        name: 'Pokemon',
        icon: Zap,
        href: '/cards?subCategory=Pokemon',
        color: 'bg-yellow-50 dark:bg-yellow-950/20'
    },
    {
        name: 'Top 100',
        icon: Medal,
        href: '/cards?subCategory=Top%20100',
        color: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
        name: 'Wembanyama',
        icon: Sparkles,
        href: '/cards?subCategory=Wembanyama',
        color: 'bg-indigo-50 dark:bg-indigo-950/20'
    },
    {
        name: 'Rookies',
        icon: Trophy,
        href: '/cards?subCategory=Rookies',
        color: 'bg-amber-50 dark:bg-amber-950/20'
    },
    {
        name: 'Signed',
        icon: Signature,
        href: '/cards?subCategory=Signed',
        color: 'bg-emerald-50 dark:bg-emerald-950/20'
    },
    {
        name: 'Flag',
        icon: Flag,
        href: '/cards?subCategory=Flag',
        color: 'bg-slate-50 dark:bg-slate-900/20'
    },
    {
        name: 'Basketball Cards',
        icon: Library,
        href: '/cards?subCategory=Basketball%20Cards',
        color: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
        name: 'View All',
        icon: ArrowRight,
        href: '/cards',
        color: 'bg-gray-50 dark:bg-gray-800'
    },
];

export default function CardCategoryGrid() {
    return (
        <section className="bg-background py-16 lg:py-24 border-b border-border/10 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">The Card Room</h2>
                        <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium">Rare wax, graded singles, and the newest sets.</p>
                    </div>
                    <Link href="/cards" className="group hidden md:flex text-sm font-black tracking-widest uppercase text-indigo-500 hover:text-indigo-400 items-center transition-all bg-indigo-500/10 px-6 py-3 rounded-full hover:bg-indigo-500/20">
                        View All Cards <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    {CARD_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group block"
                        >
                            <div className="relative h-full bg-white dark:bg-card border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:border-indigo-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:-translate-y-2 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className={cn(
                                    "relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center p-2 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                )}>
                                    {cat.logo ? (
                                        <Image
                                            src={cat.logo}
                                            alt={`${cat.name} logo`}
                                            fill
                                            className="object-contain p-2 dark:invert filter drop-shadow-sm"
                                            sizes="(max-width: 768px) 80px, 96px"
                                        />
                                    ) : cat.icon ? (() => {
                                        const Icon = cat.icon;
                                        return <Icon className="h-10 w-10 text-slate-700 dark:text-slate-300" />;
                                    })() : null}
                                </div>
                                <span className="font-black text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest text-center relative z-10">
                                    {cat.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <Link href="/cards" className="mt-8 md:hidden group text-sm font-black tracking-widest uppercase text-indigo-500 hover:text-indigo-400 flex justify-center items-center transition-all bg-indigo-500/10 px-6 py-4 rounded-full hover:bg-indigo-500/20 w-full text-center">
                    View All Cards <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}
