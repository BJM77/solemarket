"use client";

import Link from 'next/link';
import { ArrowRight, Library, Trophy, Zap, Sparkles } from 'lucide-react';
import { cn } from "@/lib/utils";

const CARD_CATEGORIES = [
    {
        name: 'NBA Cards',
        icon: Library,
        href: '/cards?subCategory=Basketball%20Cards',
        color: 'bg-orange-50 dark:bg-orange-950/20'
    },
    {
        name: 'View All Cards',
        icon: ArrowRight,
        href: '/cards',
        color: 'bg-gray-50 dark:bg-gray-800'
    },
];

export default function CardCategoryGrid() {
    return (
        <section className="bg-slate-50 dark:bg-deep-black py-12 lg:py-20 border-b border-border/10">
            <div className="max-w-[1440px] mx-auto px-4 md:px-10">
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tight uppercase">The Card Room</h2>
                        <p className="text-sm md:text-base text-muted-foreground mt-2 font-medium">Rare wax, graded singles, and the newest sets.</p>
                    </div>
                    <Link href="/cards" className="group text-sm font-bold text-indigo-600 hover:text-indigo-500 flex items-center transition-all">
                        VIEW ALL CARDS <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                    {CARD_CATEGORIES.map((cat) => (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className="group"
                        >
                            <div className="h-full bg-white dark:bg-card border border-border/50 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 hover:shadow-premium hover:-translate-y-2">
                                <div className={cn(
                                    "relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center p-4 rounded-2xl transition-transform duration-500 group-hover:scale-110",
                                    cat.color
                                )}>
                                    <cat.icon className="h-8 w-8 md:h-10 md:w-10 text-gray-700 dark:text-gray-300" />
                                </div>
                                <span className="font-black text-gray-900 dark:text-gray-100 text-xs md:text-sm uppercase tracking-widest text-center">
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
