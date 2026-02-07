

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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { features } from '@/lib/features';
import {
    LayoutGrid, Tag, User, Heart, ShoppingBag, LayoutDashboard, Shield, LogOut, LogIn,
    Coins, CreditCard, Gem, BookOpen, Stamp, Gamepad2, Search, X, Scan
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

    // 3. Fetch User Favorites
    const favoritesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return query(collection(db, 'users', user.uid, 'favorite_categories'), orderBy('name'));
    }, [user?.uid]);
    const { data: favoriteCategories, isLoading: isFavoritesLoading } = useCollection<any>(favoritesQuery);

    const handleLinkClick = (href: string) => {
        router.push(href);
        setIsOpen(false);
    };

    const handleSignOut = async () => {
        await signOutUser();
        setIsOpen(false);
        router.push('/');
    };

    const handleToggleFavorite = async (e: React.MouseEvent, cat: Category) => {
        e.stopPropagation();
        const { toggleFavoriteCategory } = await import('@/app/actions/user-preferences');
        const { getCurrentUserIdToken } = await import('@/lib/firebase/auth');
        const idToken = await getCurrentUserIdToken();
        if (idToken) {
            await toggleFavoriteCategory(idToken, cat.id, cat.name, cat.href || `/category/${cat.id}`);
        }
    };

    return (
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
            <div className="p-4 space-y-4 pb-20">
                {/* Main Actions */}
                <nav className="flex flex-col space-y-1">
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="cards" className="border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline px-4 hover:bg-muted/50 rounded-md">
                                <div className="flex items-center text-base font-medium">
                                    <CreditCard className="mr-3 h-5 w-5" /> Cards
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col pl-12 space-y-1">
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-muted-foreground" onClick={() => handleLinkClick('/collector-cards')}>All Cards</Button>
                                    {['Pokemon', 'NBA', 'WWE', 'NFL', 'AFL', 'Soccer', 'F1', 'Fantasy'].map(sub => (
                                        <Button key={sub} variant="ghost" size="sm" className="justify-start h-8 text-muted-foreground" onClick={() => handleLinkClick(`/collector-cards?subCategory=${sub}`)}>
                                            {sub}
                                        </Button>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="coins" className="border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline px-4 hover:bg-muted/50 rounded-md">
                                <div className="flex items-center text-base font-medium">
                                    <Coins className="mr-3 h-5 w-5" /> Coins
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col pl-12 space-y-1">
                                    <Button variant="ghost" size="sm" className="justify-start h-8 text-muted-foreground" onClick={() => handleLinkClick('/coins')}>All Coins</Button>
                                    {['$2', '$1', '50c'].map(sub => (
                                        <Button key={sub} variant="ghost" size="sm" className="justify-start h-8 text-muted-foreground" onClick={() => handleLinkClick(`/coins?subCategory=${sub}`)}>
                                            {sub} Coins
                                        </Button>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/collectibles')}>
                        <Gem className="mr-3 h-5 w-5" /> Memorabilia
                    </Button>
                    <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/general')}>
                        <LayoutGrid className="mr-3 h-5 w-5" /> General
                    </Button>
                    {features.bidsy && (
                        <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/bidsy')}>
                            <span className="navLinkText">Bidsy</span>
                        </Button>
                    )}
                    {features.wtb && (
                        <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/wtb')}>
                            <span className="navLinkText">WTB</span>
                        </Button>
                    )}
                    <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/scan')}>
                        <Scan className="mr-3 h-5 w-5" /> Scan
                    </Button>
                    {features.consignment && (
                        <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/consign')}>
                            <span className="navLinkText">Consign</span>
                        </Button>
                    )}
                    {features.research && user && (
                        <Button variant="ghost" className="justify-start text-base px-4" onClick={() => handleLinkClick('/research')}>
                            <Search className="mr-3 h-5 w-5" /> Research
                        </Button>
                    )}
                </nav>

                {/* Favorite Categories Section */}
                {user && (
                    <div className="py-2">
                        <h3 className="px-4 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
                            Favorite Categories
                            <Heart className="h-3 w-3 fill-primary text-primary" />
                        </h3>
                        {isFavoritesLoading ? (
                            <div className="space-y-2 px-4">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                            </div>
                        ) : favoriteCategories && favoriteCategories.length > 0 ? (
                            <div className="flex flex-col space-y-1">
                                {favoriteCategories.map((fav: any) => (
                                    <Button
                                        key={fav.id}
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start h-10 px-4 group"
                                        onClick={() => handleLinkClick(fav.href)}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <span className="flex-1 text-left">{fav.name}</span>
                                        <div
                                            onClick={(e) => handleToggleFavorite(e, fav as Category)}
                                            className="ml-auto p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded-full transition-all"
                                        >
                                            <X className="h-3 w-3 text-destructive" />
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <p className="px-4 text-xs text-muted-foreground italic">
                                Save your favorite categories below to see them here.
                            </p>
                        )}
                    </div>
                )}

                {/* Full Categories Accordion (Explore) */}
                <div className="py-2 border-t border-dashed pt-4">
                    <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Explore All</h3>
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
                                            {data.items.map((cat) => {
                                                const isFav = favoriteCategories?.some((f: any) => f.id === cat.id);
                                                return (
                                                    <div key={cat.id} className="flex items-center group/item">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="justify-start text-muted-foreground h-8 flex-1"
                                                            onClick={() => handleLinkClick(cat.href || `/category/${cat.id}`)}
                                                        >
                                                            {cat.name}
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                                            onClick={(e) => handleToggleFavorite(e, cat)}
                                                        >
                                                            <Heart className={`h-3 w-3 ${isFav ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                                                        </Button>
                                                    </div>
                                                );
                                            })}
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
                    ) : null}
                </div>
            </div>
        </ScrollArea>
    );
}
