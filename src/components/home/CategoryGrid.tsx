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
        name: 'Basketball Cards',
        icon: Library,
        href: '/trading-cards/basketball-cards',
        color: 'bg-primary/10 dark:bg-primary/20'
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
        <section className="bg-white dark:bg-deep-black py-12 lg:py-20 border-b border-border/10">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight">Shop the Lineup</h2>
                        <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium">The deepest collection of basketball heritage and performance.</p>
                    </div>
                    <Link href="/browse" className="group text-sm font-bold text-primary hover:text-primary/80 flex items-center transition-all">
                        VIEW ALL MARKET <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
                    {CATEGORIES.map((cat) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group"
                        >
                            <div className="h-full bg-muted/30 dark:bg-card border border-border/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:bg-white dark:hover:bg-white/5 hover:shadow-premium hover:-translate-y-2">
                                <div className={cn(
                                    "relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110",
                                    cat.color
                                )}>
                                    {cat.logo ? (
                                        <Image
                                            src={cat.logo}
                                            alt={`${cat.name} logo`}
                                            fill
                                            className="object-contain p-4 dark:invert"
                                        />
                                    ) : cat.icon ? (
                                        <cat.icon className="h-8 w-8 md:h-10 md:w-10 text-gray-700 dark:text-gray-300" />
                                    ) : null}
                                </div>
                                <span className="font-black text-gray-900 dark:text-gray-100 text-xs md:text-sm uppercase tracking-widest">
                                    {cat.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
