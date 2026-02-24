'use client';

import { useState } from 'react';
import { ShoppingCart, Search, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { UserNav } from './user-nav';
import { SearchCommand } from '@/components/search/SearchCommand';
import { NotificationBell } from '../notifications/NotificationBell';
import Link from 'next/link';
import { useUser } from '@/firebase';
import { LogIn, UserPlus } from 'lucide-react';

export default function HeaderActions() {
    const { itemCount, setIsCartOpen } = useCart();
    const [open, setOpen] = useState(false);
    const { user } = useUser();

    return (
        <div className="flex items-center justify-end space-x-1 lg:space-x-2">
            {!user && (
                <div className="flex items-center gap-1">
                    <Button asChild variant="ghost" size="icon" aria-label="Sign In">
                        <Link href="/sign-in">
                            <LogIn className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon" aria-label="Register">
                        <Link href="/sign-up">
                            <UserPlus className="h-5 w-5" />
                        </Link>
                    </Button>
                </div>
            )}

            {user && (
                <div className="flex items-center gap-1 lg:gap-2">
                    {/* Mobile Plus Button */}
                    <Button asChild variant="default" size="icon" className="h-9 w-9 flex lg:hidden rounded-xl shadow-lg shadow-primary/20">
                        <Link href="/sell/create" aria-label="SELL">
                            <PlusCircle className="h-5 w-5" />
                        </Link>
                    </Button>
                    {/* Desktop Button - Styled to match Donate */}
                    <Button asChild variant="default" size="sm" className="hidden lg:flex rounded-xl px-4 font-black uppercase tracking-widest shadow-lg shadow-primary/20 h-10 transition-all hover:scale-105 active:scale-95">
                        <Link href="/sell/create">SELL</Link>
                    </Button>
                </div>
            )}

            {user && <NotificationBell />}

            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Open cart with ${itemCount} items`}
            >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-black">
                        {itemCount}
                    </span>
                )}
            </Button>

            <UserNav />

            <SearchCommand open={open} setOpen={setOpen} />
        </div>
    )
}
