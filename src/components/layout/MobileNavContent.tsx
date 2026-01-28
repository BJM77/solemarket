

'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/firebase/auth';
import { useUser, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    LayoutGrid, Tag, User, Heart, ShoppingBag, LayoutDashboard, Shield, LogOut, LogIn,
    Coins, CreditCard, Gem, BookOpen, Stamp, Gamepad2, Search
} from 'lucide-react';
import type { Category, UserProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useUserPermissions } from '@/hooks/use-user-permissions';

// Helper to map DB sections to Icons
const iconMap: Record<string, any> = {
    'coins': Coins,
    'collector-cards': CreditCard,
    'collectibles': Gem,
    'comics': BookOpen,
    'stamps': Stamp,
    'video-games': Gamepad2,
};

export function MobileNavContent({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
    const { user } = useUser();
    const router = useRouter();
    const { isSuperAdmin, isLoading: isPermissionsLoading } = useUserPermissions();

    // 1. Fetch Categories Dynamically
    const categoriesQuery = useMemoFirebase(() => query(collection(db, 'categories'), orderBy('name')), []);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    // 2. Group Categories by Section
    const groupedCategories = useMemo(() => {
        const mainSections = {
            'collector-cards': { label: 'Collector Cards', icon: CreditCard, href: '/collector-cards', items: [] as Category[] },
            'coins': { label: 'Coins', icon: Coins, href: '/coins', items: [] as Category[] },
            'collectibles': { label: 'Collectibles', icon: Gem, href: '/collectibles', items: [] as Category[] },
        } as Record<string, { label: string, icon: any, href: string, items: Category[] }>;

        if (!categories) return mainSections;

        categories.forEach(cat => {
            if (mainSections[cat.section]) {
                mainSections[cat.section].items.push(cat);
            } else {
                if (!mainSections.collectibles) {
                    mainSections.collectibles = { label: 'Collectibles', icon: Gem, href: '/collectibles', items: [] };
                }
                mainSections.collectibles.items.push(cat);
            }
        });
        return mainSections;
    }, [categories]);

    const handleLinkClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    const handleSignOut = async () => {
        await signOutUser();
        setIsOpen(false);
        router.push('/');
    };

    return (
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
            <div className="p-4 space-y-4 pb-20">
                {/* Main Actions */}
                <nav className="flex flex-col space-y-1">
                    <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/collector-cards')}>
                        <CreditCard className="mr-3 h-5 w-5" /> Cards
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/coins')}>
                        <Coins className="mr-3 h-5 w-5" /> Coins
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/collectibles')}>
                        <Gem className="mr-3 h-5 w-5" /> Memorabilia
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/general')}>
                        <LayoutGrid className="mr-3 h-5 w-5" /> General
                    </Button>
                    <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/consign')}>
                        <Tag className="mr-3 h-5 w-5" /> Consign
                    </Button>
                    {user && (
                        <Button variant="ghost" className="justify-start text-base" onClick={() => handleLinkClick('/research')}>
                            <Search className="mr-3 h-5 w-5" /> Research
                        </Button>
                    )}
                </nav>

                {/* Dynamic Categories Accordion */}
                <div className="py-2">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categories</h3>
                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedCategories).map(([section, data]) => {
                            if (data.items.length === 0) return null;
                            const Icon = data.icon || LayoutGrid;

                            return (
                                <AccordionItem key={section} value={section} className="border-b-0">
                                    <AccordionTrigger className="text-base font-medium px-4 py-2 hover:bg-muted/50 rounded-md hover:no-underline">
                                        <div className="flex items-center">
                                            <Icon className="mr-3 h-5 w-5" />
                                            {data.label}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col pl-8 space-y-1 mt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start text-muted-foreground h-9 font-semibold"
                                                onClick={() => handleLinkClick(data.href)}
                                            >
                                                View All {data.label}
                                            </Button>
                                            {data.items.map((cat) => (
                                                <Button
                                                    key={cat.id}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="justify-start text-muted-foreground h-8"
                                                    onClick={() => handleLinkClick(cat.href || `/category/${cat.id}`)}
                                                >
                                                    {cat.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </div>

                {/* User Account Section */}
                <div className="border-t pt-4">
                    {user ? (
                        <>
                            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">My Account</h3>
                            <div className="space-y-1">
                                {isPermissionsLoading ? (
                                    <div className="flex items-center px-4 py-2">
                                        <Skeleton className="mr-3 h-5 w-5 rounded-sm" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                ) : isSuperAdmin ? (
                                    <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/admin')}>
                                        <Shield className="mr-3 h-5 w-5 text-primary" /> Admin Dashboard
                                    </Button>
                                ) : null}

                                <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/profile')}>
                                    <User className="mr-3 h-5 w-5" /> My Profile
                                </Button>
                                <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/profile/favorites')}>
                                    <Heart className="mr-3 h-5 w-5" /> My Favorites
                                </Button>
                                <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/profile/listings')}>
                                    <ShoppingBag className="mr-3 h-5 w-5" /> My Listings
                                </Button>
                            </div>

                            <div className="border-t mt-4 pt-4">
                                <Button variant="ghost" className="justify-start w-full text-muted-foreground hover:text-destructive" onClick={handleSignOut}>
                                    <LogOut className="mr-3 h-5 w-5" /> Sign Out
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-1">
                            <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Account</h3>
                            <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/sign-in')}>
                                <LogIn className="mr-3 h-5 w-5" /> Sign In
                            </Button>
                            <Button variant="ghost" className="justify-start w-full" onClick={() => handleLinkClick('/sign-up')}>
                                <User className="mr-3 h-5 w-5" /> Create Account
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    );
}
