
'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { CollapsibleSidebarLayout } from '@/components/layout/collapsible-sidebar-layout';
import { CoinsSidebar } from '@/components/layout/CoinsSidebar';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy }from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import type { Category } from '@/lib/types';


export default function CoinsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const categoriesQuery = useMemoFirebase(() => query(collection(db, 'categories'), where('section', '==', 'coins'), orderBy('name', 'asc')), []);
  const { data: categories, isLoading } = useCollection<Category>(categoriesQuery);

  // Simple pages that should use the sidebar
  const sidebarPages = [
    '/coins/world',
    '/coins/ancient',
    '/coins/by-metal',
    '/coins/by-year',
    '/coins/modern',
    '/coins/coins'
  ];

  // Also include dynamic category pages
  const dynamicSidebarPages = (categories || []).map(cat => cat.href);
  const allSidebarPages = [...sidebarPages, ...dynamicSidebarPages, ...categories?.map(c => c.href) || []];
  
  const isSidebarPage = allSidebarPages.some(p => pathname === p || pathname.startsWith(p + '/'));

  // Define full-width pages explicitly
  const fullWidthPages = ['/coins', '/coins/bullion'];
  if (fullWidthPages.includes(pathname)) {
      return <>{children}</>;
  }

  if (isSidebarPage) {
    return (
      <CollapsibleSidebarLayout sidebar={<CoinsSidebar pathname={pathname} categories={categories || []} />}>
        <div className="p-4 sm:p-6 lg:p-8">
            {children}
        </div>
      </CollapsibleSidebarLayout>
    );
  }

  // Fallback for pages like /coins, /coins/bullion, etc., that have their own full-width layout
  return (
    <>
      {children}
    </>
  );
}
