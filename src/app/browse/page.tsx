'use client';

import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { useSearchParams } from 'next/navigation';

export default function BrowsePage() {
  const searchParams = useSearchParams();
  const searchTerm = searchParams.get('q') || '';

  return (
    <InfiniteProductGrid
      pageTitle={searchTerm ? `Results for "${searchTerm}"` : 'All Collectibles'}
      pageDescription="Browse items from thousands of sellers."
      initialFilterState={{
        q: searchTerm
      }}
    />
  );
}
