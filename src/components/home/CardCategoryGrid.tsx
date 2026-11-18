"use client";

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Library, Trophy, Zap, Sparkles, PenTool, Medal, CircleDollarSign, Layers, type LucideIcon } from 'lucide-react';
import { cn } from "@/lib/utils/ui";
import { useSiteConfig } from '@/providers/SiteConfigProvider';
import { completeCardRoomItems, DEFAULT_CARD_ROOM_ITEMS } from '@/lib/home/card-room';

const CARD_ROOM_ICONS: Record<string, LucideIcon> = {
    Zap,
    Medal,
    Trophy,
    Signature: PenTool,
    Sparkles,
    Library,
    CircleDollarSign,
    Layers,
};

export default function CardCategoryGrid() {
    const { config } = useSiteConfig();
    const section = config.sections.find((s) => s.type === 'card_room' || s.id === 'sec-card-room');

    if (section && !section.enabled) return null;

    const title = section?.title || 'The Card Room';
    const subtitle = section?.subtitle || 'Basketball wax, graded singles, and the newest sets.';
    const categories = completeCardRoomItems(
        section?.items && section.items.length > 0 ? section.items : DEFAULT_CARD_ROOM_ITEMS,
    );
    const containerClasses = section?.customClasses || 'bg-background py-16 lg:py-24 border-b border-border/10 relative overflow-hidden';

    return (
        <section className={containerClasses}>
            <div className="max-w-[1440px] mx-auto px-6 md:px-10 relative z-10">
                <div className="flex flex-col md:flex-row items-end justify-between mb-8 md:mb-12 gap-3 md:gap-4">
                    <div>
                        <h2 className="text-2xl md:text-5xl font-black text-foreground tracking-tighter uppercase italic">{title}</h2>
                        <p className="text-xs md:text-lg text-muted-foreground mt-1 md:mt-2 font-medium">{subtitle}</p>
                    </div>
                    <Link href="/cards" className="group hidden md:flex text-sm font-black tracking-widest uppercase text-orange-700 dark:text-orange-700 items-center transition-all bg-orange-500/10 px-6 py-3 rounded-full hover:bg-orange-500/20">
                        View All Cards <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6">
                    {categories.map((cat, idx) => {
                        const itemKey = ('id' in cat && cat.id) ? cat.id : `${cat.name}-${idx}`;
                        const Icon = (cat.iconName && CARD_ROOM_ICONS[cat.iconName]) || Sparkles;
                        return (
                            <Link
                                key={itemKey}
                                href={cat.href}
                                className="group block"
                            >
                                <div className="relative h-full bg-card border border-border rounded-2xl md:rounded-[2rem] p-4 md:p-6 flex flex-col items-center justify-center gap-3 md:gap-6 transition-all duration-500 hover:border-orange-500/50 hover:shadow-[0_0_40px_rgba(99,102,241,0.15)] hover:-translate-y-2 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                    <div className={cn(
                                        "relative w-12 h-12 md:w-24 md:h-24 flex items-center justify-center p-2 rounded-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                        cat.color
                                    )}>
                                        {cat.logo ? (
                                            <Image
                                                src={cat.logo}
                                                alt={`${cat.name} logo`}
                                                fill
                                                className="object-contain p-2 dark:invert filter drop-shadow-sm"
                                                sizes="(max-width: 768px) 48px, 96px"
                                            />
                                        ) : (
                                            <Icon className="h-6 w-6 md:h-10 md:w-10 text-muted-foreground" />
                                        )}
                                    </div>
                                    <span className="font-black text-foreground text-[10px] md:text-sm uppercase tracking-widest text-center relative z-10">
                                        {cat.name}
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                <Link href="/cards" className="mt-6 md:mt-8 md:hidden group text-xs md:text-sm font-black tracking-widest uppercase text-orange-700 dark:text-orange-700 flex justify-center items-center transition-all bg-orange-500/10 px-4 py-3 md:px-6 md:py-4 rounded-full hover:bg-orange-500/20 w-full text-center">
                    View All Cards <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
            </div>
        </section>
    );
}
