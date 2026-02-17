'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { items } = useCart();
  const cartCount = items.length;
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Browse', href: '/browse', icon: Search },
    { label: 'Sell', href: '/sell/create', icon: PlusSquare },
    { label: 'Cart', href: '#', icon: ShoppingBag, isCart: true },
    { label: 'Account', href: user ? '/profile' : '/sign-in', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-t border-border/10 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          if (item.isCart) {
            return (
              <button
                key={item.label}
                className="flex flex-col items-center justify-center w-full h-full gap-1 text-muted-foreground transition-colors hover:text-primary relative"
                onClick={() => {
                  // Trigger cart drawer - assuming there's a global way or just link to /cart if exists
                  // For now, let's just make it a link to browse or something if no cart page
                }}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center ring-2 ring-background">
                      {cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full gap-1 transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground hover:text-primary"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isActive ? "opacity-100" : "opacity-70")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
