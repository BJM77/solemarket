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

    // Base path to ensure we don't redirect out of admin
    const basePath = pathname || '/browse';

    // In admin mode, the isCardsMode flag is solely dependent on search params right now unless we check
    // However, if we're in /admin/products, we might want simple universal filters or both.
    // Let's keep the user's specific subCategory tabs but make them use basePath.

    if (isCardsMode) {
        pills = [
            { name: 'All Cards', icon: Library, href: `${basePath}${basePath.includes('admin') ? '?category=Collector Cards' : ''}` },
            { name: 'Basketball Cards', icon: Library, href: `${basePath}?category=Collector Cards&subCategory=Basketball%20Cards` },
            { name: 'New Arrivals', icon: Sparkles, href: `${basePath}?category=Collector Cards&sort=createdAt-desc` },
            { name: 'Sneakers →', icon: Footprints, href: basePath.includes('admin') ? `${basePath}?category=Sneakers` : `/browse` },
        ];
    } else {
        pills = [
            { name: 'All Sneakers', icon: Footprints, href: `${basePath}${basePath.includes('admin') ? '?category=Sneakers' : ''}` },
            { name: 'Basketball', icon: Footprints, href: `${basePath}?category=Sneakers&subCategory=Basketball` },
            { name: 'Lifestyle', icon: Footprints, href: `${basePath}?category=Sneakers&subCategory=Lifestyle` },
            { name: 'Running', icon: Footprints, href: `${basePath}?category=Sneakers&subCategory=Running` },
            { name: 'New Arrivals', icon: Sparkles, href: `${basePath}?category=Sneakers&sort=createdAt-desc` },
            { name: 'Cards →', icon: Library, href: basePath.includes('admin') ? `${basePath}?category=Collector Cards` : `/cards` },
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
