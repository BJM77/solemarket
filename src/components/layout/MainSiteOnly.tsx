'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

/**
 * Renders the basketball site's chrome (announcement bar, header + market
 * ticker, footer, bottom nav) everywhere except the coins storefront, which
 * has its own header and footer in src/app/coins/layout.tsx.
 *
 * Uses the active route segment rather than the URL, so it also works on
 * coins.benched.au where "/browse" is internally served from /coins/browse.
 */
export function MainSiteOnly({ children }: { children: React.ReactNode }) {
  const segment = useSelectedLayoutSegment();
  if (segment === 'coins') return null;
  return <>{children}</>;
}
