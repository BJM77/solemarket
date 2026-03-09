'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase';
import { useMobileNav } from '@/context/MobileNavContext';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useUser();
  const { isVisible } = useMobileNav();

  const navItems = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Browse', href: '/browse', icon: Search },
    { label: 'Sell', href: '/sell/create', icon: PlusCircle, primary: true },
    { label: 'Activity', href: '/profile/orders', icon: Bell },
    { label: 'Profile', href: user ? '/profile' : '/sign-in', icon: User },
  ];

  return (
    <nav className={cn(
      "md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-t border-border/50 px-2 pb-safe pt-2 h-[4.5rem] transition-all duration-500 ease-in-out shadow-[0_-8px_30px_rgb(0,0,0,0.12)]",
      !isVisible ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
    )}>
      <div className="flex items-center justify-around h-full max-w-lg mx-auto relative">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -top-6 flex flex-col items-center group tap-haptic"
              >
                <div className="bg-primary text-black p-4 rounded-full shadow-2xl shadow-primary/40 transition-all duration-300 hover:scale-105 ring-[4px] ring-background group-hover:shadow-primary/60 pulse-glow">
                  <item.icon className="h-6 w-6" strokeWidth={3} />
                </div>
                <span className={cn(
                  "text-[10px] font-black mt-1 uppercase tracking-widest transition-colors duration-300",
                  isActive ? "text-primary" : "text-muted-foreground/60"
                )}>
                  {item.label}
                </span>
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur-xl opacity-0 group-active:opacity-100 transition-opacity" />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 transition-all duration-300 tap-haptic-subtle group relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-all duration-300",
                isActive ? "bg-primary/10" : "group-hover:bg-accent/50"
              )}>
                <item.icon className={cn("h-5 w-5 transition-all duration-300", isActive && "stroke-[2.5px] scale-110")} />
              </div>
              <span className={cn(
                "text-[10px] font-bold mt-1 uppercase tracking-tighter transition-all duration-300",
                isActive ? "opacity-100" : "opacity-60 group-hover:opacity-100"
              )}>
                {item.label}
              </span>

              {isActive && (
                <div className="absolute -top-1 w-1 h-1 bg-primary rounded-full bounce-subtle" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
