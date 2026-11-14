'use client';

import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { UserNav } from './user-nav';
import { NotificationBell } from '../notifications/NotificationBell';
import { NewOrderAlerts } from '../notifications/NewOrderAlerts';
import { useUser } from '@/firebase';
import { TeamPickerButton } from '@/components/team-theme/TeamPicker';

export default function HeaderActions() {
    const { itemCount, setIsCartOpen } = useCart();
    const { user } = useUser();

    return (
        <div className="flex items-center justify-end space-x-1 lg:space-x-2">
            {user && (
                <div className="flex items-center gap-1 lg:gap-2">
                    {/* Sell buttons removed as requested */}
                </div>
            )}

            {user && (
                <div>
                    <NotificationBell />
                    <NewOrderAlerts />
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
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-black text-primary-foreground">
                        {itemCount}
                    </span>
                )}
            </Button>

            <TeamPickerButton className="hidden md:inline-flex" />

            <UserNav />

        </div>
    )
}
