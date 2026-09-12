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
    const currentSubCategory = searchParams.get('subCategory');

    // Determine the context based on paths or search params
    const isCardsContext = pathname?.includes('/cards') || currentCategory === 'Collector Cards' || currentCategory === 'Trading Cards';
    const isShoesContext = pathname?.includes('/shoes') || currentCategory === 'Sneakers';
    const isCoinsContext = pathname?.includes('/coins') || currentCategory === 'Coins';

    // 1. Global Pills (Always first)
    const globalPills = [
        { name: 'All', href: '/browse' },
        { name: 'Shoes', href: '/shoes' },
        { name: 'Cards', href: '/cards' },
        { name: 'Coins', href: '/coins' },
    ];

    // 2. Contextual Pills (Relevant to the page)
    let contextualPills: { name: string; href: string }[] = [];

    // Base path for contextual pills to preserve current environment (admin or public)
    const isAdminPath = pathname?.includes('/admin/');
    const basePath = pathname || '/browse';

    if (isCardsContext) {
        contextualPills = [
            { name: 'Basketball', href: `${basePath}?category=Collector+Cards&subCategory=Basketball+Cards` },
            { name: 'Pokémon', href: `${basePath}?category=Collector+Cards&subCategory=Pok%C3%A9mon` },
            { name: 'Yu-Gi-Oh!', href: `${basePath}?category=Collector+Cards&subCategory=Yu-Gi-Oh!` },
            { name: 'Rookies', href: `${basePath}?category=Collector+Cards&subCategory=Rookies` },
            { name: 'New Arrivals', href: `${basePath}?category=Collector+Cards&sort=createdAt-desc` },
        ];
    } else if (isShoesContext || pathname === '/browse' || pathname === '/') {
        contextualPills = [
            { name: 'Jordan', href: `${basePath}?category=Sneakers&subCategory=Jordan&brand=Jordan` },
            { name: 'Nike', href: `${basePath}?category=Sneakers&subCategory=Nike&brand=Nike` },
            { name: 'Adidas', href: `${basePath}?category=Sneakers&subCategory=Adidas&brand=Adidas` },
            { name: 'Yeezy', href: `${basePath}?category=Sneakers&subCategory=Yeezy&brand=Yeezy` },
            { name: 'New Arrivals', href: `${basePath}?category=Sneakers&sort=createdAt-desc` },
        ];
    } else if (isCoinsContext) {
        contextualPills = [
            { name: 'Australian', href: `${basePath}?category=Coins&subCategory=Australian+Coins` },
            { name: 'World', href: `${basePath}?category=Coins&subCategory=World+Coins` },
            { name: 'Gold & Silver', href: `${basePath}?category=Coins&subCategory=Gold` },
            { name: 'Proof Sets', href: `${basePath}?category=Coins&subCategory=Proof+Sets` },
            { name: 'New Arrivals', href: `${basePath}?category=Coins&sort=createdAt-desc` },
        ];
    }

    const allPills = [...globalPills, ...contextualPills];

    return (
        <div className={cn("w-full overflow-x-auto scrollbar-hide py-2", className)}>
            <div className="flex items-center gap-2 px-4 min-w-max">
                {allPills.map((cat) => {
                    // Active Logic
                    let isActive = false;
                    
                    if (cat.name === 'All') {
                        isActive = pathname === '/browse' && !currentCategory;
                    } else if (cat.name === 'Shoes') {
                        isActive = pathname === '/shoes' || currentCategory === 'Sneakers';
                    } else if (cat.name === 'Cards') {
                        isActive = pathname === '/cards' || currentCategory === 'Collector Cards' || currentCategory === 'Trading Cards';
                    } else if (cat.name === 'Coins') {
                        isActive = pathname === '/coins' || currentCategory === 'Coins';
                    } else {
                        // Subcategory active logic
                        const sp = new URLSearchParams(cat.href.split('?')[1] || '');
                        const catSub = sp.get('subCategory');
                        const catSort = sp.get('sort');

                        if (catSub && currentSubCategory === catSub) {
                            isActive = true;
                        } else if (catSort && searchParams.get('sort') === catSort) {
                            isActive = true;
                        }
                    }

                    return (
                        <Link
                            key={cat.name}
                            href={cat.href}
                            rel={cat.href.includes('?') ? 'nofollow' : undefined}
                            className={cn(
                                "flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all border",
                                isActive
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                    : "bg-white/5 border-white/5 text-muted-foreground hover:bg-white/10 hover:text-white",
                                "active:scale-95 whitespace-nowrap"
                            )}
                        >
                            {cat.name}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
