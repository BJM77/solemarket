'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Layers, LayoutGrid, Shirt, Footprints, Watch, ShoppingBag, Sparkles, Library } from 'lucide-react';

interface CategoryPillsProps {
    className?: string;
}

export function CategoryPills({ className }: CategoryPillsProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const currentCategory = searchParams.get('category');

    // Determine the context visually based on paths or explicitly passed params
    const isCardsMode = pathname?.includes('/cards') || currentCategory === 'Collector Cards' || currentCategory === 'Trading Cards';

    let pills = [];

    if (isCardsMode) {
        pills = [
            { name: 'All Cards', icon: Library, href: '/cards' },
            { name: 'Basketball Cards', icon: Library, href: '/cards?subCategory=Basketball%20Cards' },
            { name: 'New Arrivals', icon: Sparkles, href: '/cards?sort=newest' },
        ];
    } else {
        pills = [
            { name: 'All Sneakers', icon: Footprints, href: '/browse' },
            { name: 'Basketball', icon: Footprints, href: '/browse?subCategory=Basketball' },
            { name: 'Lifestyle', icon: Footprints, href: '/browse?subCategory=Lifestyle' },
            { name: 'Running', icon: Footprints, href: '/browse?subCategory=Running' },
            { name: 'New Arrivals', icon: Sparkles, href: '/browse?sort=newest' },
        ];
    }

    return (
        <div className={cn("w-full overflow-x-auto scrollbar-hide py-2", className)}>
            <div className="flex items-center gap-2 px-4 min-w-max">
                {pills.map((cat) => {
                    const Icon = cat.icon;

                    // Simple active logic
                    let isActive = false;
                    const sp = new URLSearchParams(cat.href.split('?')[1] || '');

                    const catSub = sp.get('subCategory');
                    const catSort = sp.get('sort');

                    if (catSub && searchParams.get('subCategory') === catSub) {
                        isActive = true;
                    } else if (catSort && searchParams.get('sort') === catSort) {
                        isActive = true;
                    } else if (!catSub && !catSort && !searchParams.get('subCategory') && !searchParams.get('sort') && !searchParams.get('q')) {
                        isActive = true;
                    }

                    return (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
                                isActive
                                    ? "bg-primary text-white border-primary"
                                    : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-primary/5 hover:text-primary hover:border-primary/20",
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
