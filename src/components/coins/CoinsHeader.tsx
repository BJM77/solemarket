'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Coins, Search, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { UserNav } from '@/components/layout/user-nav';
import { DesktopInlineSearch, MobileInlineSearch } from '@/components/search/InlineSearch';
import { RecentlyViewedStrip } from '@/components/search/RecentlyViewedStrip';

/** Links inside the coins storefront always use /coins/...: they work on benched.au/coins and coins.benched.au. */
export const COINS_NAV = [
  { label: 'Shop all', href: '/coins/browse' },
  { label: 'Coins', href: '/coins/browse?coinType=coins' },
  { label: 'Bullion', href: '/coins/browse?coinType=bullion' },
  { label: 'Australian', href: '/coins/browse?subCategory=Australian+Coins' },
  { label: 'World', href: '/coins/browse?subCategory=World+Coins' },
  { label: 'Banknotes', href: '/coins/browse?coinType=banknotes' },
  { label: 'Sell coins', href: '/coins/sell' },
];

/** Plain search form shown until the page is interactive (and without JavaScript). */
function SearchBox() {
  const params = useSearchParams();
  return (
    <form action="/coins/browse" method="get" role="search" className="relative flex-1 max-w-xl">
      <label htmlFor="coins-search" className="sr-only">Search coins and bullion</label>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        id="coins-search"
        name="q"
        type="search"
        defaultValue={params.get('q') || ''}
        placeholder="Search coins, bullion, banknotes…"
        className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      />
    </form>
  );
}

export function CoinsHeader() {
  const { itemCount, setIsCartOpen } = useCart();
  // The instant search dropdown (same as the basketball header, coins and bullion only) needs the browser.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80" data-storefront-header="coins">
      <div className="container mx-auto max-w-screen-2xl px-4">
        <div className="flex h-16 items-center gap-3 md:gap-6">
          <Link href="/coins" className="flex shrink-0 items-center gap-2" aria-label="Benched Coins home">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 text-slate-950">
              <Coins className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg font-black tracking-tight">
              Benched <span className="text-amber-600">Coins</span>
            </span>
          </Link>
          {/* Desktop: inline search (results drop down below the bar) + recently viewed coin listings */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
            {isClient
              ? <DesktopInlineSearch storefront="coins" className="h-10 w-full max-w-[420px]" />
              : <Suspense fallback={null}><SearchBox /></Suspense>}
            {isClient && <RecentlyViewedStrip storefront="coins" className="hidden lg:flex" />}
          </div>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setIsCartOpen(true)}
              aria-label={`Open cart with ${itemCount} items`}
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-slate-950">
                  {itemCount}
                </span>
              )}
            </Button>
            <UserNav />
          </div>
        </div>
        <div className="pb-3 lg:hidden">
          {isClient ? <MobileInlineSearch storefront="coins" /> : <Suspense fallback={null}><SearchBox /></Suspense>}
        </div>
        <nav aria-label="Benched Coins" className="-mx-4 overflow-x-auto px-4 pb-2">
          <ul className="flex min-w-max items-center gap-1 text-sm font-semibold">
            {COINS_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={item.href === '/coins/sell'
                    ? 'inline-flex rounded-full bg-amber-500 px-3 py-1.5 text-slate-950 hover:bg-amber-400'
                    : 'inline-flex rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
