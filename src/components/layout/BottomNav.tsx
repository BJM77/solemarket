'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusSquare, ShoppingBag, User, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useCart } from '@/context/CartContext';
import { useState, useEffect } from 'react';
import { useMobileNav } from '@/context/MobileNavContext';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { items } = useCart();
  const cartCount = items.length;
  const [isClient, setIsClient] = useState(false);
  const { isPinned, setIsPinned, isVisible } = useMobileNav();

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
    <nav className={cn(
      "md:hidden fixed bottom-0 left-0 w-full z-50 px-4 pb-6 pt-0 transition-transform duration-300 ease-in-out",
      !isVisible && !isPinned ? "translate-y-[150%]" : "translate-y-0"
    )}>
      <div className="max-w-md mx-auto bg-card/95 backdrop-blur-lg border border-white/10 rounded-full px-2 py-2 flex items-center justify-between shadow-2xl relative">
        {/* Pin Button */}
        <button
          onClick={() => setIsPinned(!isPinned)}
          className="absolute -top-3 right-4 bg-background border border-white/10 rounded-full p-1.5 shadow-md text-slate-400 hover:text-white flex items-center justify-center group z-10"
          aria-label={isPinned ? "Unpin menu" : "Pin menu"}
        >
          {isPinned ? <Pin className="h-3 w-3 fill-primary text-primary" /> : <PinOff className="h-3 w-3 group-hover:text-primary transition-colors" />}
        </button>

        <Link href="/" className={cn("flex flex-1 flex-col items-center justify-center gap-1 group", pathname === '/' ? "text-primary" : "text-slate-400 hover:text-white transition-colors")}>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", pathname === '/' ? "bg-primary/10" : "group-hover:bg-white/5")}>
            <Home className="h-6 w-6" />
          </div>
        </Link>

        <Link href="/browse" className={cn("flex flex-1 flex-col items-center justify-center gap-1 group", pathname === '/browse' ? "text-primary" : "text-slate-400 hover:text-white transition-colors")}>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", pathname === '/browse' ? "bg-primary/10" : "group-hover:bg-white/5")}>
            <Search className="h-6 w-6" />
          </div>
        </Link>

        {/* Center Floating Button for Drop/Sell */}
        <div className="relative -top-6">
          <Link href="/sell/create" className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_0_15px_rgba(242,108,13,0.6)] border-4 border-background transform transition-transform hover:scale-110 active:scale-95">
            <PlusSquare className="h-7 w-7" />
          </Link>
        </div>

        <button className={cn("flex flex-1 flex-col items-center justify-center gap-1 group", pathname === '/cart' ? "text-primary" : "text-slate-400 hover:text-white transition-colors")}>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", pathname === '/cart' ? "bg-primary/10" : "group-hover:bg-white/5")}>
            <div className="relative">
              <ShoppingBag className="h-6 w-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 flex items-center justify-center rounded-full bg-primary text-[8px] text-white font-bold">
                  {cartCount}
                </span>
              )}
            </div>
          </div>
        </button>

        <Link href={user ? '/profile' : '/sign-in'} className={cn("flex flex-1 flex-col items-center justify-center gap-1 group", pathname.startsWith('/profile') ? "text-primary" : "text-slate-400 hover:text-white transition-colors")}>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-full transition-colors", pathname.startsWith('/profile') ? "bg-primary/10" : "group-hover:bg-white/5")}>
            <User className="h-6 w-6" />
          </div>
        </Link>
      </div>
    </nav>
  );
}
