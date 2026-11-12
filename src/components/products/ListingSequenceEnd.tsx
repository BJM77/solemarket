'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/ui';

/** Shown when Next is tapped after the buyer has stepped through every listing. */
export function ListingSequenceEnd({ returnHref, onClose, className }: { returnHref: string; onClose: () => void; className?: string }) {
  return (
    <div
      role="status"
      data-testid="listing-sequence-end"
      className={cn('rounded-2xl border border-border bg-background shadow-2xl p-4 text-sm', className)}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="font-black text-foreground">You&apos;ve seen every listing</p>
          <p className="text-muted-foreground mt-0.5">That&apos;s everything for sale right now. New drops land daily.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground p-1 -m-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <Link
        href={returnHref}
        onClick={onClose}
        className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-primary px-4 font-bold text-primary-foreground"
      >
        Back to browse
      </Link>
    </div>
  );
}
