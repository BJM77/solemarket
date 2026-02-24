'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/firebase/auth';
import { useUser, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { features } from '@/lib/features';
import {
    LayoutGrid, Tag, User, Heart, ShoppingBag, LayoutDashboard, Shield, LogOut, LogIn,
    Footprints, Watch, Zap, Search, Scan, X, CreditCard, Gem, Calendar, BookOpen
} from 'lucide-react';
import type { Category } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export function MobileNavContent({ setIsOpen }: { setIsOpen: (isOpen: boolean) => void }) {
    const { user } = useUser();
    const router = useRouter();
    const { isSuperAdmin, canSell, isLoading: isPermissionsLoading } = useUserPermissions();

    // 1. Fetch Categories Dynamically
    const categoriesQuery = useMemoFirebase(() => query(collection(db, 'categories'), orderBy('name')), []);
    const { data: categories } = useCollection<Category>(categoriesQuery);

    const groupedCategories = useMemo(() => {
        const mainSections = {
            'sneakers': { label: 'Sneakers', icon: Footprints, href: '/browse?category=Sneakers', items: [] as Category[] },
            'trading-cards': { label: 'Cards', icon: Gem, href: '/cards', items: [] as Category[] },
        } as Record<string, { label: string, icon: any, href: string, items: Category[] }>;

        if (!categories) return mainSections;

        // Sort categories by order (client-side to handle missing fields)
        const sortedCategories = [...categories].sort((a, b) => (a.order || 0) - (b.order || 0));

        sortedCategories.forEach(cat => {
            // Respect showInNav flag (default to true if undefined)
            if (cat.showInNav === false) return;

            // Map old sections to new ones if necessary, or just push to 'accessories' as fallback
            const sectionMap: Record<string, string> = {
                'sneakers': 'sneakers',
                'cat_sneakers': 'sneakers',
                'cat_cards': 'trading-cards',
                'trading-cards': 'trading-cards',
            };

            const targetSection = sectionMap[cat.section] || 'sneakers';

            if (mainSections[targetSection]) {
                mainSections[targetSection].items.push(cat);
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
            await toggleFavoriteCategory(idToken, cat.id, cat.name, cat.href || `/browse?category=${cat.id}`);
        }
    };

    const getInitials = (name?: string | null) => {
        if (!name) return 'U';
        const names = name.split(' ');
        if (names.length > 1) {
            return `${names[0][0]}${names[names.length - 1][0]}`;
        }
        return name[0];
    };

    return (
        <ScrollArea className="flex-1 h-[calc(100vh-80px)]">
            <div className="p-4 space-y-6 pb-20">
                {/* User Header (Mobile optimized) */}
                {user && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 rounded-2xl mb-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20 overflow-hidden">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <span>{getInitials(user.displayName)}</span>
                            )}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold truncate">{user.displayName || 'Account'}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                        </div>
                    </div>
                )}

                {/* Main Navigation Sections */}
                <nav className="flex flex-col space-y-1">
                    <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Explore</h3>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="sneakers" className="border-b-0">
                            <AccordionTrigger className="py-3 hover:no-underline px-4 hover:bg-primary/5 hover:text-primary transition-all rounded-xl group">
                                <div className="flex items-center text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 p-2 rounded-lg mr-3 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                        <Footprints className="h-5 w-5" />
                                    </div>
                                    Sneakers
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-2 gap-2 px-4 mt-2 mb-2">
                                    <Button variant="secondary" size="sm" className="justify-start h-10 font-medium" onClick={() => handleLinkClick('/browse?category=Sneakers')}>All Sneakers</Button>
                                    <Button variant="outline" size="sm" className="justify-start h-10 font-medium" onClick={() => handleLinkClick('/browse?category=Sneakers&subCategory=Jordan')}>Jordan</Button>
                                    <Button variant="outline" size="sm" className="justify-start h-10 font-medium" onClick={() => handleLinkClick('/browse?category=Sneakers&subCategory=Nike')}>Nike</Button>
                                    <Button variant="outline" size="sm" className="justify-start h-10 font-medium" onClick={() => handleLinkClick('/browse?category=Sneakers&subCategory=Yeezy')}>Yeezy</Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="cards" className="border-b-0">
                            <AccordionTrigger className="py-3 hover:no-underline px-4 hover:bg-primary/5 hover:text-primary transition-all rounded-xl group">
                                <div className="flex items-center text-base font-bold text-gray-900 dark:text-gray-100 group-hover:text-primary">
                                    <div className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 p-2 rounded-lg mr-3 transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                                        <Gem className="h-5 w-5" />
                                    </div>
                                    Trading Cards
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="grid grid-cols-2 gap-2 px-4 mt-2 mb-2">
                                    <Button variant="secondary" size="sm" className="justify-start h-10 font-bold hover:bg-primary/10 hover:text-primary" onClick={() => handleLinkClick('/cards')}>All Cards</Button>
                                    <Button variant="outline" size="sm" className="justify-start h-10 font-bold hover:bg-primary/5 hover:text-primary transition-colors" onClick={() => handleLinkClick('/cards?subCategory=Basketball%20Cards')}>NBA Cards</Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>



                    {features.bidsy && (
                        <Button variant="ghost" className="justify-start text-sm font-bold px-4 hover:bg-primary/5 hover:text-primary rounded-xl h-11 transition-all" onClick={() => handleLinkClick('/bidsy')}>
                            <Zap className="mr-3 h-4 w-4 text-primary" /> Bidsy
                        </Button>
                    )}

                    <Button variant="ghost" className="justify-start text-sm font-bold px-4 hover:bg-primary/5 hover:text-primary rounded-xl h-11 transition-all" onClick={() => handleLinkClick('/guides')}>
                        <BookOpen className="mr-3 h-4 w-4 text-primary" /> Collector Guides
                    </Button>

                    {features.wtb && (
                        <Button variant="ghost" className="justify-start text-sm font-bold px-4 hover:bg-primary/5 hover:text-primary rounded-xl h-11 transition-all" onClick={() => handleLinkClick('/wtb')}>
                            <ShoppingBag className="mr-3 h-4 w-4 text-primary" /> Wanted
                        </Button>
                    )}

                    <Button variant="default" className="justify-start text-sm font-bold px-4 rounded-xl h-11 shadow-lg shadow-primary/20 mt-2" onClick={() => handleLinkClick('/donate')}>
                        <Heart className="mr-3 h-4 w-4 fill-white" /> Donate Kicks
                    </Button>
                </nav>

                {/* Tools & Services Sections (Matching Desktop) */}
                <nav className="flex flex-col space-y-1">
                    <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Tools & Services</h3>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="tools" className="border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline px-4 hover:bg-primary/5 hover:text-primary transition-all rounded-xl group/trigger">
                                <div className="flex items-center text-sm font-bold">
                                    <Scan className="mr-3 h-4 w-4 text-primary" /> Tools
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col pl-11 space-y-1 mt-1">
                                    <Button variant="ghost" size="sm" className="justify-start h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-bold transition-all" onClick={() => handleLinkClick('/scan')}>Kicks Scanner</Button>
                                    <Button variant="ghost" size="sm" className="justify-start h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-bold transition-all" onClick={() => handleLinkClick('/card-scan')}>Card Scanner</Button>
                                    {features.research && user && (
                                        <Button variant="ghost" size="sm" className="justify-start h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-bold transition-all" onClick={() => handleLinkClick('/research')}>Research Lab</Button>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="services" className="border-b-0">
                            <AccordionTrigger className="py-2 hover:no-underline px-4 hover:bg-primary/5 hover:text-primary transition-all rounded-xl">
                                <div className="flex items-center text-sm font-bold">
                                    <Shield className="mr-3 h-4 w-4 text-primary" /> Services
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="flex flex-col pl-11 space-y-1 mt-1">
                                    {features.consignment && (
                                        <Button variant="ghost" size="sm" className="justify-start h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-bold transition-all" onClick={() => handleLinkClick('/consign')}>Consignment</Button>
                                    )}
                                    <Button variant="ghost" size="sm" className="justify-start h-9 text-muted-foreground hover:text-primary hover:bg-primary/5 text-xs font-bold transition-all" onClick={() => handleLinkClick('/dealsafe')}>DealSafe Escrow</Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </nav>

                {/* Favorite Categories Section */}
                {user && (
                    <div className="py-2">
                        <h3 className="px-4 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-3 flex items-center justify-between">
                            Favorites
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
                                        className="justify-start h-10 px-4 group rounded-xl"
                                        onClick={() => handleLinkClick(fav.href)}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary mr-3 opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <span className="flex-1 text-left text-sm font-medium">{fav.name}</span>
                                        <div
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFavorite(e, fav as any);
                                            }}
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

                {/* Full Categories Accordion (Explore All) */}
                <div className="py-2 border-t border-dashed pt-4">
                    <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">Explore All</h3>
                    <div className="grid grid-cols-2 gap-2 mb-2 px-4">
                        <Button variant="default" className="w-full font-bold shadow-md shadow-primary/20" onClick={() => handleLinkClick('/browse')}>
                            <Search className="mr-2 h-4 w-4" /> Browse All
                        </Button>
                        <Button variant="secondary" className="w-full font-bold text-primary" onClick={() => handleLinkClick('/multilisting-deals')}>
                            <LayoutGrid className="mr-2 h-4 w-4" /> Deals
                        </Button>
                    </div>

                    <div className="px-4 mb-2 space-y-2">
                        <Button variant="outline" className="w-full justify-start font-bold h-12" onClick={() => handleLinkClick('/drops')}>
                            <div className="bg-red-100 text-red-600 p-1.5 rounded-lg mr-3">
                                <Zap className="h-4 w-4" />
                            </div>
                            Kicks Calendar
                        </Button>
                        <Button variant="outline" className="w-full justify-start font-bold h-12" onClick={() => handleLinkClick('/card-drops')}>
                            <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg mr-3">
                                <Calendar className="h-4 w-4" />
                            </div>
                            Card Calendar
                        </Button>
                    </div>

                    <Accordion type="multiple" className="w-full">
                        {Object.entries(groupedCategories).map(([section, data]) => {
                            if (data.items.length === 0) return null;
                            const Icon = data.icon || LayoutGrid;

                            return (
                                <AccordionItem key={section} value={section} className="border-b-0">
                                    <AccordionTrigger className="text-sm font-bold px-4 py-2 hover:bg-primary/5 hover:text-primary transition-all rounded-xl hover:no-underline group">
                                        <div className="flex items-center">
                                            <Icon className="mr-3 h-4 w-4 text-primary" />
                                            {data.label}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="flex flex-col pl-8 space-y-1 mt-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="justify-start text-muted-foreground h-9 font-semibold text-xs"
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
                                                            className="justify-start text-muted-foreground h-8 flex-1 text-xs"
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
                            <h3 className="px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-2">My Account</h3>
                            <div className="space-y-1">
                                {isPermissionsLoading ? (
                                    <div className="flex items-center px-4 py-2">
                                        <Skeleton className="mr-3 h-5 w-5 rounded-sm" />
                                        <Skeleton className="h-5 w-32" />
                                    </div>
                                ) : isSuperAdmin ? (
                                    <>
                                        <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/admin')}>
                                            <Shield className="mr-3 h-4 w-4 text-primary" /> Admin Dashboard
                                        </Button>
                                        <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/admin/power-tools')}>
                                            <Zap className="mr-3 h-4 w-4 text-amber-500" /> Power Tools
                                        </Button>
                                    </>
                                ) : null}

                                <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/profile')}>
                                    <User className="mr-3 h-4 w-4 text-primary" /> My Profile
                                </Button>

                                {canSell && (
                                    <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/sell/dashboard')}>
                                        <LayoutDashboard className="mr-3 h-4 w-4 text-primary" /> Seller Dashboard
                                    </Button>
                                )}

                                <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/profile/favorites')}>
                                    <Heart className="mr-3 h-4 w-4 text-primary" /> My Favorites
                                </Button>

                                <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/profile/orders')}>
                                    <CreditCard className="mr-3 h-4 w-4 text-primary" /> My Purchases
                                </Button>

                                <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/profile/listings')}>
                                    <Tag className="mr-3 h-4 w-4 text-primary" /> My Listings
                                </Button>

                                {canSell && (
                                    <Button variant="ghost" className="justify-start w-full font-bold text-sm h-11 rounded-xl" onClick={() => handleLinkClick('/sell/create')}>
                                        <ShoppingBag className="mr-3 h-4 w-4 text-primary" /> Sell Item
                                    </Button>
                                )}
                            </div>

                            <div className="border-t mt-4 pt-4">
                                <Button variant="ghost" className="justify-start w-full text-muted-foreground hover:text-destructive font-bold text-sm h-11 rounded-xl" onClick={handleSignOut}>
                                    <LogOut className="mr-3 h-4 w-4" /> Sign Out
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="px-4 py-2 space-y-3">
                            <p className="text-xs text-muted-foreground mb-4">Sign in to sync your favorites and start selling.</p>
                            <Button className="w-full font-bold rounded-xl h-11" onClick={() => handleLinkClick('/sign-in')}>
                                <LogIn className="mr-2 h-4 w-4" /> Sign In
                            </Button>
                            <Button variant="outline" className="w-full font-bold rounded-xl h-11" onClick={() => handleLinkClick('/sign-up')}>
                                <User className="mr-2 h-4 w-4" /> Register
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </ScrollArea>
    );
}