'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sparkles, Coins, Stamp, Layers, Trophy, Dna, LayoutGrid, CreditCard } from 'lucide-react';

const CATEGORIES = [
    { name: 'Pokemon', icon: Dna, href: '/category/pokemon-cards' },
    { name: 'NBA Cards', icon: Layers, href: '/category/nba-trading-cards' },
    { name: 'Coins', icon: Coins, href: '/coins' },
    { name: 'Comics', icon: Sparkles, href: '/collectibles/comics' },
    { name: 'Stamps', icon: Stamp, href: '/collectibles/stamps' },
    { name: 'Memorabilia', icon: Trophy, href: '/category/memorabilia' },
    { name: 'All Cards', icon: CreditCard, href: '/category/collector-cards' },
    { name: 'View All', icon: LayoutGrid, href: '/browse' },
];

interface CategoryPillsProps {
    className?: string;
}

export function CategoryPills({ className }: CategoryPillsProps) {
    const searchParams = useSearchParams();
    // Simple check: if current path contains href or query param matches
    // But since this is used on Product Page too, we might not have a selected category state.
    // We'll just render them as links.

    return (
        <div className={cn("w-full overflow-x-auto scrollbar-hide py-2", className)}>
            <div className="flex items-center gap-2 px-4 min-w-max">
                {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                                "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200",
                                "hover:bg-primary/5 hover:text-primary hover:border-primary/20",
                                "active:scale-95"
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
