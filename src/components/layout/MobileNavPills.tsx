'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, ShoppingBag, CreditCard, Flame, Star, History } from 'lucide-react';

interface MobileNavPillsProps {
    onSearchClick?: () => void;
}

export function MobileNavPills({ onSearchClick }: MobileNavPillsProps) {
    const pathname = usePathname();
    
    // Determine context
    const isSneakerPage = pathname === '/browse' || pathname.includes('category=Sneakers');
    const isCardPage = pathname === '/cards' || pathname.includes('category=Collector%20Cards');

    // Define nav items based on context
    let navItems = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Sneakers', href: '/browse', icon: ShoppingBag },
        { label: 'Cards', href: '/cards', icon: CreditCard },
    ];

    if (isSneakerPage) {
        navItems = [
            { label: 'Home', href: '/', icon: Home },
            { label: 'Jordan', href: '/browse?category=Sneakers&subCategory=Jordan', icon: Flame },
            { label: 'Limited', href: '/browse?category=Sneakers&subCategory=Limited', icon: Star },
            { label: 'Vintage', href: '/browse?category=Sneakers&subCategory=Vintage', icon: History },
        ];
    } else if (isCardPage) {
        navItems = [
            { label: 'Home', href: '/', icon: Home },
            { label: 'NBA', href: '/cards?subCategory=Basketball%20Cards', icon: Flame },
            { label: 'Pokémon', href: '/cards?subCategory=Pokemon', icon: Star },
            { label: 'Rookies', href: '/cards?subCategory=Rookies', icon: History },
        ];
    }

    return (
        <div className="flex items-center justify-start gap-2 py-3 px-4 md:hidden overflow-x-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
                // For subcategories, we check if the current URL contains the subcategory name
                const isActive = pathname === item.href || (item.href !== '/' && pathname.includes(encodeURIComponent(item.label)));

                return (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className={cn(
                            "flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 border-2 whitespace-nowrap tap-haptic-subtle cursor-pointer shrink-0",
                            isActive
                                ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                                : "bg-background text-foreground border-muted-foreground/20 active:scale-95"
                        )}
                    >
                        <item.icon className="h-3.5 w-3.5" />
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
