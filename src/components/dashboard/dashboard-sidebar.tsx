
'use client';

import React from 'react';
import Link from 'next/link';
import {
    Home,
    Package,
    Wand2,
    DollarSign,
    Star,
    AreaChart,
    Settings,
    Camera,
    Package2,
    Sparkles,
    Layers,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/layout/sidebar-provider';
import { SidebarToggle } from '../layout/sidebar-toggle';

const navItems = [
    { href: '/sell/dashboard', label: 'Dashboard', icon: Home },
    { href: '/sell/listings', label: 'My Listings', icon: Package },
    { href: '/sell/payouts', label: 'Payouts', icon: DollarSign },
    { href: '/sell/reviews', label: 'Reviews', icon: Star },
    { href: '/sell/analytics', label: 'Analytics', icon: AreaChart },
    { href: '/sell/settings', label: 'Settings', icon: Settings },
];

const aiTools = [
    { href: '/sell/bulk-lister', label: 'Bulk AI Lister', icon: Layers },
    { href: '/sell/cards', label: 'AI Card Grader', icon: Sparkles },
]

export default function DashboardSidebar() {
    const pathname = usePathname();
    const { isSidebarOpen } = useSidebar();

    return (
        <div className={cn("flex flex-col h-full bg-muted/40", isSidebarOpen ? 'w-64' : 'w-20')}>
            <div className="flex items-center justify-between p-4 border-b h-16">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                    <Package2 className="h-6 w-6 shrink-0" />
                    <span className={cn('transition-opacity', isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0')}>Benched Seller</span>
                </Link>
                <SidebarToggle />
            </div>
            <nav className="flex-grow p-2 space-y-1">
                {navItems.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                            pathname === item.href && 'bg-primary/10 text-primary',
                            !isSidebarOpen && 'justify-center'
                        )}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={cn('whitespace-nowrap transition-opacity', isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0')}>{item.label}</span>
                    </Link>
                ))}
                <div className="px-3 py-2">
                    <h2 className={cn('text-xs font-semibold text-muted-foreground tracking-wider transition-opacity', isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0')}>AI Tools</h2>
                </div>
                {aiTools.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                            pathname === item.href && 'bg-primary/10 text-primary',
                            !isSidebarOpen && 'justify-center'
                        )}
                    >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className={cn('whitespace-nowrap transition-opacity', isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0')}>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
