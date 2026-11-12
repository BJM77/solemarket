'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { readRecentViews, forgetRecentView, RECENT_VIEWS_EVENT, RECENT_VIEWS_KEY, type RecentView } from '@/lib/recent-views';
import { cn } from '@/lib/utils/ui';

/** Desktop header: thumbnails of the last 5 listings this visitor opened (hidden when empty). */
export function RecentlyViewedStrip({ className }: { className?: string }) {
  const [items, setItems] = useState<RecentView[]>([]);

  useEffect(() => {
    const load = () => setItems(readRecentViews());
    load();
    const onStorage = (e: StorageEvent) => { if (e.key === RECENT_VIEWS_KEY) load(); };
    window.addEventListener(RECENT_VIEWS_EVENT, load);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(RECENT_VIEWS_EVENT, load);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
