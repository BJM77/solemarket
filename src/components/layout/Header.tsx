
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '../logo';
import { MobileNav } from './mobile-nav';
import HeaderActions from './HeaderActions';
import { Suspense, useEffect, useState } from 'react';
import { MainNavLinks } from './MainNavLinks';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';
import { useMobileNav } from '@/context/MobileNavContext';
import { MarketTicker } from '../home/MarketTicker';
import { cn } from "@/lib/utils/ui";
import { PrefetchLikelyRoutes } from './PrefetchLikelyRoutes';
import { DesktopInlineSearch, MobileInlineSearch } from '../search/InlineSearch';
import { RecentlyViewedStrip } from '../search/RecentlyViewedStrip';

export default function Header() {
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();
  const { isPinned } = useMobileNav();

  const isMarketplacePage = pathname === '/browse' || pathname === '/shoes' || pathname === '/cards';

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-40 bg-background/95 shadow-sm backdrop-blur-md transition-all duration-300 border-b border-border">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-2 lg:gap-8">
          <div className={cn("flex items-center gap-2 lg:gap-8 flex-1", isPinned && "w-full")}>
            {isClient && <MobileNav />}

            <Link href="/" className={cn("flex items-center", isPinned ? "hidden md:flex" : "flex")} aria-label="Back to homepage">
              <Logo className="h-[60px] md:h-12 lg:h-14" priority />
            </Link>

            {/* Desktop: inline search (results drop down below the bar) + recently viewed thumbnails */}
            <div className="hidden lg:flex flex-1 items-center gap-3 min-w-0">
              {isClient && <DesktopInlineSearch className="w-full max-w-[336px] h-10" />}
              {isClient && <RecentlyViewedStrip className="hidden lg:flex" />}
            </div>
            
            {/* Mobile Search - ALWAYS VISIBLE; expands to a full-screen search on tap */}
            {isClient && (
              <div className="flex-1 lg:hidden mx-2 max-w-[200px] xs:max-w-none">
                <MobileInlineSearch />
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-8">
            {isClient && <MainNavLinks />}
          </div>

          <div className={cn("flex items-center justify-end gap-1 md:gap-2", isPinned ? "hidden md:flex" : "flex")}>
            {/* Mobile search icon removed as requested */}
            {isClient && (
              <>
                <Suspense fallback={<div className="h-10 w-24 bg-muted/20 rounded-md" />}>
                  <HeaderActions />
                </Suspense>
              </>
            )}
          </div>
        </div>
      </header>


      {/* 
        Home Navigation Pills (Mobile Only)
        Replacing the scrolling ticker with discovery pills
      */}

      <PrefetchLikelyRoutes />

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
