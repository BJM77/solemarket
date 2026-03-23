
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../logo';
import { MobileNav } from './mobile-nav';
import HeaderActions from './HeaderActions';
import { Suspense, useEffect, useState } from 'react';
import { MainNavLinks } from './MainNavLinks';
import { SearchBar } from './search-bar';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { useMobileNav } from '@/context/MobileNavContext';
import { MarketTicker } from '../home/MarketTicker';
import { MobileNavPills } from './MobileNavPills';
import { cn } from '@/lib/utils';

export default function Header() {
  const [isClient, setIsClient] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const pathname = usePathname();
  const { isPinned } = useMobileNav();

  const isMarketplacePage = pathname === '/browse' || pathname === '/shoes' || pathname === '/cards';

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-40 bg-background/90 dark:bg-background/90 backdrop-blur-md transition-all duration-300">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-2 lg:gap-8">
          <div className={cn("flex items-center gap-2 lg:gap-8 flex-1", isPinned && "w-full")}>
            {isClient && <MobileNav />}

            <Link href="/" className={cn("flex items-center", isPinned ? "hidden md:flex" : "flex")} aria-label="Back to homepage">
              <Logo className="h-[60px] md:h-12 lg:h-14" />
            </Link>

            {/* Mobile Nav Pills when pinned - replacing ticker */}
            {isClient && isPinned && !isMarketplacePage && (
              <div className="flex-1 md:hidden overflow-hidden h-9 bg-transparent border-0 ml-2">
                <MobileNavPills onSearchClick={() => setShowMobileSearch(!showMobileSearch)} />
              </div>
            )}

            {isClient && <SearchBar className="hidden lg:flex flex-1 max-w-2xl h-10 group" />}
            
            {/* Mobile Search - ALWAYS VISIBLE */}
            {isClient && (
              <div className="flex-1 lg:hidden mx-2 max-w-[200px] xs:max-w-none">
                <SearchBar className="h-10 group" inputClassName="h-10 text-xs" />
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {isClient && <MainNavLinks />}
          </div>

          <div className={cn("flex items-center justify-end gap-1 md:gap-2", isPinned ? "hidden md:flex" : "flex")}>
            {/* Mobile search icon removed as requested */}
            {isClient && (
              <Suspense fallback={<div className="h-10 w-24 bg-muted/20 rounded-md" />}>
                <HeaderActions />
              </Suspense>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {isClient && showMobileSearch && (
        <div className="lg:hidden sticky top-[60px] z-40 bg-background border-b px-4 py-3 shadow-md animate-in slide-in-from-top-4 duration-300">
          <SearchBar
            className="w-full h-12"
            inputClassName="h-12"
            onSearch={() => setShowMobileSearch(false)}
          />
        </div>
      )}

      {/* 
        Home Navigation Pills (Mobile Only)
        Replacing the scrolling ticker with discovery pills
      */}
      {isClient && !isMarketplacePage && (
        <div className={cn(
          "transition-all duration-300 md:hidden",
          isPinned ? "hidden" : "block"
        )}>
          <MobileNavPills onSearchClick={() => setShowMobileSearch(!showMobileSearch)} />
        </div>
      )}

      {/* Desktop Ticker Only */}
      {isClient && (
        <div className="hidden md:block transition-all duration-300">
          <MarketTicker />
        </div>
      )}

      {/* If pinned, we still need the compact one in the header? 
          The user said 2 tickers flash. Let's just have ONE that moves.
      */}
    </>
  );
}
