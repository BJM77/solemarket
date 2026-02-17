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
        <div className="flex items-center justify-end space-x-1 md:space-x-2">
            {!user ? (
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
            ) : (
                <NotificationBell />
            )}

            {user && (
                <div className="flex items-center gap-1 md:gap-2">
                    {/* Mobile Plus Button */}
                    <Button asChild variant="default" size="icon" className="h-9 w-9 flex md:hidden rounded-full shadow-sm">
                        <Link href="/sell/create" aria-label="Sell Item">
                            <PlusCircle className="h-5 w-5" />
                        </Link>
                    </Button>
                    {/* Desktop Button */}
                    <Button asChild variant="default" size="sm" className="hidden md:flex rounded-full px-4">
                        <Link href="/sell/create">Sell Item</Link>
                    </Button>
                </div>
            )}

            <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setIsCartOpen(true)}
                aria-label={`Open cart with ${itemCount} items`}
            >
                <ShoppingCart className="h-5 w-5" />
                {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                        {itemCount}
                    </span>
                )}
            </Button>

            <UserNav />

            <SearchCommand open={open} setOpen={setOpen} />
        </div>
    )
}
