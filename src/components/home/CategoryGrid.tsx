"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LayoutGrid, Footprints, Library } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    {
        name: 'Jordan',
        logo: '/brand-logos/jordan.png',
        href: '/browse?category=Jordan',
        color: 'bg-red-50 dark:bg-red-950/20'
    },
    {
        name: 'Nike',
        logo: '/brand-logos/nike.png',
        href: '/browse?category=Nike',
        color: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
        name: 'Adidas',
        logo: '/brand-logos/adidas.png',
        href: '/browse?category=Adidas',
        color: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
        name: 'Yeezy',
        logo: '/brand-logos/yeezy.png',
        href: '/browse?category=Yeezy',
        color: 'bg-gray-50 dark:bg-gray-800'
    },
    {
        name: 'New Balance',
        logo: '/brand-logos/new-balance.png',
        href: '/browse?category=New-Balance',
        color: 'bg-green-50 dark:bg-green-950/20'
    },
    {
        name: 'Puma',
        icon: Footprints,
        href: '/browse?category=Puma',
        color: 'bg-yellow-50 dark:bg-yellow-950/20'
    },
    {
        name: 'Reebok',
        icon: Footprints,
        href: '/browse?category=Reebok',
        color: 'bg-blue-50 dark:bg-blue-950/20'
    },
    {
        name: 'Under Armour',
        icon: Footprints,
        href: '/browse?category=Under-Armour',
        color: 'bg-slate-100 dark:bg-slate-800'
    },
    {
        name: 'Converse',
        icon: Footprints,
        href: '/browse?category=Converse',
        color: 'bg-zinc-100 dark:bg-zinc-800'
    },
    {
        name: 'ANTA',
        icon: Footprints,
        href: '/browse?category=ANTA',
        color: 'bg-red-50 dark:bg-red-900/20'
    },
    {
        name: 'View All',
        icon: ArrowRight,
        href: '/browse',
        color: 'bg-gray-50 dark:bg-gray-800'
    },
];

export default function CategoryGrid() {
    return (
        <section className="bg-background py-16 lg:py-24 border-b border-border/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-4">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">Shop the Lineup</h2>
                        <p className="text-sm md:text-lg text-slate-500 dark:text-slate-400 mt-2 font-medium">The deepest collection of basketball heritage and performance.</p>
                    </div>
                    <Link href="/browse" className="group hidden md:flex text-sm font-black tracking-widest uppercase text-primary hover:text-orange-400 items-center transition-all bg-primary/10 px-6 py-3 rounded-full hover:bg-primary/20">
                        View All Market <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {CATEGORIES.map((cat, idx) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group block"
                        >
                            <div className="relative h-full bg-white dark:bg-card border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:border-primary/50 hover:shadow-[0_0_40px_rgba(242,108,13,0.15)] hover:-translate-y-2 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className={cn(
                                    "relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center p-5 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner",
                                    cat.color.includes('dark:bg-') ? cat.color : "bg-slate-100 dark:bg-slate-800"
                                )}>
                                    {cat.logo ? (
                                        <Image
                                            src={cat.logo}
                                            alt={`${cat.name} logo`}
                                            fill
                                            className="object-contain p-4 dark:invert drop-shadow-md"
                                        />
                                    ) : cat.icon ? (
                                        <cat.icon className="h-10 w-10 text-slate-700 dark:text-slate-300" />
                                    ) : null}
                                </div>
                                <span className="font-black text-slate-900 dark:text-white text-xs md:text-sm uppercase tracking-widest text-center relative z-10">
                                    {cat.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <Link href="/browse" className="mt-8 md:hidden group text-sm font-black tracking-widest uppercase text-primary hover:text-orange-400 flex justify-center items-center transition-all bg-primary/10 px-6 py-4 rounded-full hover:bg-primary/20 w-full text-center">
                    View All Market <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}
