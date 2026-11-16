'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

/**
 * Hides its children (the spot price ticker) on the coins listing tools
 * (/coins/sell for adding and editing), the same way the basketball site
 * hides its ticker on admin, add/edit and checkout pages. Checkout and admin
 * are shared pages outside the coins layout, so the ticker never shows there.
 */
export function HideOnListingTools({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  if (segment === 'sell') return null;
  return <>{children}</>;
}
