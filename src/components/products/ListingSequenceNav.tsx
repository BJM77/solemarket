'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listingIdFromPath } from '@/lib/listing-nav';
import { useListingSequence } from '@/lib/listing-nav/store';
import { ListingSequenceEnd } from './ListingSequenceEnd';
import { cn } from '@/lib/utils/ui';

const BTN = 'inline-flex h-8 items-center gap-1 rounded-full border border-border px-3 text-sm font-semibold transition-colors';

/** Desktop Previous/Next for a listing page (phones use the bottom nav). */
export function ListingSequenceNav({ productId, className }: { productId: string; className?: string }) {
  const pathname = usePathname();
  const id = listingIdFromPath(pathname) || productId;
  const seq = useListingSequence(id, pathname);
  const [showEnd, setShowEnd] = useState(false);
  useEffect(() => { setShowEnd(false); }, [id]);
  if (!seq) return null;

  return (
    <div className={cn('relative items-center gap-2', className)} data-listing-nav>
      {seq.prev ? (
        <Link href={seq.prev.url} className={cn(BTN, 'hover:bg-accent')} data-testid="listing-nav-prev" aria-label="Previous listing">
          <ChevronLeft className="h-4 w-4" /> Prev
        </Link>
      ) : (
        <span className={cn(BTN, 'opacity-40')} aria-disabled="true" data-testid="listing-nav-prev"><ChevronLeft className="h-4 w-4" /> Prev</span>
      )}
      {seq.next ? (
        <Link href={seq.next.url} className={cn(BTN, 'hover:bg-accent')} data-testid="listing-nav-next" aria-label="Next listing">
          Next <ChevronRight className="h-4 w-4" />
        </Link>
      ) : seq.done ? (
        <button type="button" className={cn(BTN, 'hover:bg-accent')} data-testid="listing-nav-next" data-end="true" onClick={() => setShowEnd((v) => !v)}>
          Next <ChevronRight className="h-4 w-4" />
        </button>
      ) : (
        <span className={cn(BTN, 'opacity-40')} aria-disabled="true" data-testid="listing-nav-next">Next <ChevronRight className="h-4 w-4" /></span>
      )}
      {showEnd && (
        <ListingSequenceEnd returnHref={seq.returnHref} onClose={() => setShowEnd(false)} className="absolute right-0 top-full mt-2 w-72 z-40" />
      )}
    </div>
  );
}
