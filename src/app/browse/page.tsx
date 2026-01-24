'use client';

import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { useSearchParams } from 'next/navigation';

function BrowsePageContent() {
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

export default function BrowsePage() {
  return (
    <Suspense>
      <BrowsePageContent />
    </Suspense>
  )
}
