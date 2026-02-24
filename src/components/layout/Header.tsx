
'use client';

import Link from 'next/link';
import { Logo } from '../logo';
import { MobileNav } from './mobile-nav';
import HeaderActions from './HeaderActions';
import { Suspense, useEffect, useState } from 'react';
import { MainNavLinks } from './MainNavLinks';
import { SearchBar } from './search-bar';
import { Search } from 'lucide-react';
import { Button } from '../ui/button';

export default function Header() {
  const [isClient, setIsClient] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-40 bg-background/90 dark:bg-background/90 backdrop-blur-md transition-all duration-300">
        <div className="max-w-[1440px] w-full mx-auto flex items-center justify-between gap-2 md:gap-8">
          <div className="flex items-center gap-2 md:gap-8 flex-1">
            {isClient && <MobileNav />}
            <Link href="/" className="flex items-center" aria-label="Back to homepage">
              <Logo />
            </Link>
            {isClient && <SearchBar className="hidden lg:flex flex-1 max-w-2xl h-10 group" />}
          </div>

          <div className="hidden md:flex items-center gap-8">
            {isClient && <MainNavLinks />}
          </div>

          <div className="flex items-center justify-end gap-1 md:gap-2">
            {isClient && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-10 w-10"
                onClick={() => setShowMobileSearch(!showMobileSearch)}
                aria-label="Toggle search"
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
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
        <div className="lg:hidden sticky top-[60px] z-40 bg-background border-b px-4 py-3 shadow-md">
          <SearchBar
            className="w-full h-12"
            inputClassName="h-12"
          />
        </div>
      )}
    </>
  );
}
