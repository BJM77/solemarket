'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, ShoppingBag, CreditCard, Search } from 'lucide-react';

interface MobileNavPillsProps {
    onSearchClick?: () => void;
}

export function MobileNavPills({ onSearchClick }: MobileNavPillsProps) {
    const pathname = usePathname();

    const navItems = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Sneakers', href: '/browse', icon: ShoppingBag },
        { label: 'Cards', href: '/cards', icon: CreditCard },
    ];

    return (
        <div className="flex items-center justify-center gap-2 py-3 px-4 md:hidden overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                    <Link 
                        key={item.href} 
                        href={item.href} 
                        className={cn(
                            "flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold transition-all duration-200 border-2 whitespace-nowrap tap-haptic-subtle cursor-pointer",
                            isActive
                                ? "bg-primary text-black border-primary shadow-lg shadow-primary/20"
                                : "bg-background text-foreground border-muted-foreground/20 hover:border-primary/50"
                        )}
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
