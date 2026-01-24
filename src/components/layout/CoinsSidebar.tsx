
'use client'; // This component is now interactive and used within a client component

import {
  Coins,
  Shield,
  Globe,
  Calendar,
  Scale,
  Landmark,
  Diamond,
} from 'lucide-react';
import type { Category } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { SidebarToggle } from './sidebar-toggle';
import { useSidebar } from '@/components/layout/sidebar-provider';

const staticCoinNavItems = [
  { title: 'All Coins', href: '/coins', icon: Landmark, isStatic: true },
  { title: 'World Coins', href: '/coins/world', icon: Globe, isStatic: true },
  { title: 'Ancient Coins', href: '/coins/ancient', icon: Shield, isStatic: true },
  { title: 'Bullion', href: '/coins/bullion', icon: Diamond, isStatic: true },
];

export function CoinsSidebar({ pathname, categories }: { pathname: string; categories: Category[] }) {
  const { isSidebarOpen } = useSidebar();
  
  const dynamicNavItems = categories.map((cat: Category) => ({
    title: cat.name,
    href: cat.href,
    icon: Coins, // Default icon for dynamic categories
  }));

  const combinedNavItems = [...staticCoinNavItems, ...dynamicNavItems];

  return (
    <div className={cn("flex flex-col h-full bg-muted/40", isSidebarOpen ? 'w-64' : 'w-20' )}>
        <div className="flex items-center justify-between p-4 border-b h-16">
            <div className="flex items-center">
                <Coins className="h-8 w-8 text-primary flex-shrink-0" />
                <h1 className={cn('ml-3 text-xl font-bold font-headline transition-opacity duration-200', isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0')}>
                    Coins
                </h1>
            </div>
            <SidebarToggle />
        </div>
        <nav className="flex-grow p-2 space-y-1">
            <ul className="space-y-2">
            {combinedNavItems.map((item) => (
                <li key={item.title}>
                <Link
                    href={item.href}
                    className={cn(
                    'flex items-center p-3 rounded-lg',
                    pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground',
                    !isSidebarOpen && 'justify-center'
                    )}
                >
                    <item.icon className="h-6 w-6 flex-shrink-0" />
                    <span
                    className={cn(
                        'ml-4 font-medium transition-opacity duration-200 whitespace-nowrap',
                        isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'
                    )}
                    >
                    {item.title}
                    </span>
                </Link>
                </li>
            ))}
            </ul>
        </nav>
    </div>
  );
}
