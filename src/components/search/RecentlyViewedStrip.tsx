'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { readRecentViews, forgetRecentView, recentViewsKey, RECENT_VIEWS_EVENT, type RecentStorefront, type RecentView } from '@/lib/recent-views';
import { cn } from '@/lib/utils/ui';
import { productCoverStyle } from '@/lib/images/focal-point';

/**
 * Desktop header: thumbnails of the last 5 listings this visitor opened (hidden when empty).
 * `storefront="coins"` shows only Benched Coins listings; the main site never shows coins.
 */
export function RecentlyViewedStrip({ className, storefront = 'main' }: { className?: string; storefront?: RecentStorefront }) {
  const [items, setItems] = useState<RecentView[]>([]);

  useEffect(() => {
    const load = () => setItems(readRecentViews(storefront));
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === recentViewsKey(storefront)) load(); };
    window.addEventListener(RECENT_VIEWS_EVENT, load);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RECENT_VIEWS_EVENT, load);
      window.removeEventListener('storage', onStorage);
    };
  }, [storefront]);

  if (!items.length) return null;

  return (
    <nav aria-label="Recently viewed" className={cn('items-center gap-1.5', className)}>
      {items.map((r) => (
        <Link
          key={r.id}
          href={r.url}
          title={r.title}
          aria-label={`Recently viewed: ${r.title}`}
          className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border bg-muted transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {r.thumb ? (
            <Image
              src={r.thumb}
              alt=""
              fill
              sizes="40px"
              quality={50}
              className="object-cover"
              style={productCoverStyle({ imageFocalPoints: r.focal ? [r.focal] : undefined }, 0)}
              onError={() => forgetRecentView(r.id)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
              {r.title.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );
}
