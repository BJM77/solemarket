'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils/ui';
import { COIN_SUBCATEGORIES } from '@/lib/coin-listings';

const PILLS: { label: string; href: string; match: (p: URLSearchParams) => boolean }[] = [
  { label: 'All', href: '/coins/browse', match: (p) => !p.get('coinType') && !p.get('subCategory') },
  { label: 'Coins', href: '/coins/browse?coinType=coins', match: (p) => p.get('coinType') === 'coins' && !p.get('subCategory') },
  { label: 'Bullion', href: '/coins/browse?coinType=bullion', match: (p) => p.get('coinType') === 'bullion' && !p.get('subCategory') },
  ...COIN_SUBCATEGORIES.map((s) => ({
    label: s,
    href: `/coins/browse?subCategory=${encodeURIComponent(s).replace(/%20/g, '+')}`,
    match: (p: URLSearchParams) => p.get('subCategory') === s,
  })),
];

function Inner({ className }: { className?: string }) {
  const params = useSearchParams();
  return (
    <div className={cn('w-full overflow-x-auto py-2', className)}>
      <div className="flex min-w-max items-center gap-2">
        {PILLS.map((pill) => {
          const active = pill.match(params);
          return (
            <Link
              key={pill.label}
              href={pill.href}
              rel="nofollow"
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-bold transition-colors whitespace-nowrap',
                active ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-border bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {pill.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Coins storefront category pills (replaces the basketball pills on coins grids). */
export function CoinCategoryPills(props: { className?: string }) {
  return <Suspense fallback={null}><Inner {...props} /></Suspense>;
}
