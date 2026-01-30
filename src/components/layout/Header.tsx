
'use client';

import Link from 'next/link';
import { Logo } from '../logo';
import { MobileNav } from './mobile-nav';
import HeaderActions from './HeaderActions';
import { Suspense, useEffect, useState } from 'react';
import { MainNavLinks } from './MainNavLinks';
import { SearchBar } from './search-bar';

export default function Header() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <header className="sticky top-0 glass-nav z-50 px-4 md:px-10 py-3">
      <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-8">
        <div className="flex items-center gap-4 md:gap-8 flex-1">
          {isClient && <MobileNav />}
          <Link href="/" className="flex items-center" aria-label="Back to homepage">
            <Logo />
          </Link>
          {isClient && <SearchBar className="hidden lg:flex flex-1 max-w-2xl h-10 group" />}
        </div>

        <div className="hidden md:flex items-center gap-8">
          {isClient && <MainNavLinks />}
        </div>

        <div className="flex items-center justify-end gap-2">
          {isClient && (
            <Suspense fallback={<div className="h-10 w-24 bg-muted/20 rounded-md" />}>
              <HeaderActions />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}
