"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, LayoutGrid, Footprints, Library } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CATEGORIES = [
    {
        name: 'Jordan',
        logo: '/brand-logos/svg/jordan.svg',
        href: '/browse?category=Sneakers&search=jordan',
        color: 'bg-red-50/50 dark:bg-red-950/10'
    },
    {
        name: 'Nike',
        logo: '/brand-logos/svg/nike.svg',
        href: '/browse?category=Sneakers&search=nike',
        color: 'bg-orange-50/50 dark:bg-orange-950/10'
    },
    {
        name: 'Adidas',
        logo: '/brand-logos/svg/adidas.svg',
        href: '/browse?category=Sneakers&search=adidas',
        color: 'bg-blue-50/50 dark:bg-blue-950/10'
    },
    {
        name: 'New Balance',
        logo: '/brand-logos/svg/new-balance.svg',
        href: '/browse?category=Sneakers&search=new+balance',
        color: 'bg-green-50/50 dark:bg-green-950/10'
    },
    {
        name: 'Under Armour',
        logo: '/brand-logos/svg/under-armour.svg',
        href: '/browse?category=Sneakers&search=under+armour',
        color: 'bg-slate-100/50 dark:bg-slate-800/10'
    },
    {
        name: 'Reebok',
        logo: '/brand-logos/svg/reebok.svg',
        href: '/browse?category=Sneakers&search=reebok',
        color: 'bg-blue-50/50 dark:bg-blue-950/10'
    },
    {
        name: 'Puma',
        logo: '/brand-logos/svg/puma.svg',
        href: '/browse?category=Sneakers&search=puma',
        color: 'bg-yellow-50/50 dark:bg-yellow-950/10'
    },
    {
        name: 'Converse',
        logo: '/brand-logos/svg/converse.svg',
        href: '/browse?category=Sneakers&search=converse',
        color: 'bg-zinc-100/50 dark:bg-zinc-800/10'
    },
    {
        name: 'Kobe',
        logo: '/brand-logos/svg/kobe.svg',
        href: '/browse?category=Sneakers&search=kobe',
        color: 'bg-purple-50/50 dark:bg-purple-950/10'
    },
    {
        name: 'LeBron',
        logo: '/brand-logos/svg/lebron.svg',
        href: '/browse?category=Sneakers&search=lebron',
        color: 'bg-gold-50/50 dark:bg-yellow-950/10'
    },
    {
        name: 'Curry',
        logo: '/brand-logos/svg/curry.svg',
        href: '/browse?category=Sneakers&search=curry',
        color: 'bg-blue-50/50 dark:bg-blue-950/10'
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
                                    "relative w-20 h-20 md:w-24 md:h-24 flex items-center justify-center p-2 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                    // Removed shadow-inner and background color from here to let it sit on the card
                                )}>
                                    {cat.logo ? (
                                        <Image
                                            src={cat.logo}
                                            alt={`${cat.name} logo`}
                                            fill
                                            className="object-contain p-2 dark:invert filter drop-shadow-sm"
                                            sizes="(max-width: 768px) 80px, 96px"
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
