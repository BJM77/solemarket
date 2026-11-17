
'use client';

import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import EmptyState from '../ui/EmptyState';
import { Package, Upload } from 'lucide-react';
import { QuickView } from './QuickView';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useUserPermissions } from '@/hooks/use-user-permissions';

const GRID_LAYOUTS = {
  default: 'w-screen max-w-[100vw] ml-[calc(50%-50vw)] px-3 md:w-auto md:max-w-full md:ml-0 md:px-0 grid grid-cols-2 gap-3 md:gap-x-4 md:gap-y-8 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 xl:gap-x-8 mt-4 md:mt-8 overflow-hidden',
  // 2 / 3 / 5 columns so 15 Just Listed items fill complete rows from md up; 2-col phones keep a comfortable card size.
  justListed: 'w-screen max-w-[100vw] ml-[calc(50%-50vw)] px-3 md:w-auto md:max-w-full md:ml-0 md:px-0 grid grid-cols-2 gap-3 md:gap-x-4 md:gap-y-8 md:grid-cols-3 lg:grid-cols-5 lg:gap-x-6 xl:gap-x-8 mt-4 md:mt-8 overflow-hidden',
} as const;

export interface ProductGridProps {
  products: Product[];
  /** How many leading cards load eagerly with high fetch priority. */
  priorityCount?: number;
  layout?: keyof typeof GRID_LAYOUTS;
}

export default function ProductGrid({ products, priorityCount = 6, layout = 'default' }: ProductGridProps) {
  const { canSell } = useUserPermissions();

  if (!products || products.length === 0) {
    return <EmptyState 
      icon={<Package className="h-12 w-12 text-muted-foreground" />}
      title="No Products Found"
      description="Try adjusting your search or filters to find what you're looking for."
    >
        {canSell && (
          <Button asChild className="mt-6">
              <Link href="/sell/create">
                  <Upload className="h-4 w-4 mr-2" />
                  List an Item
              </Link>
          </Button>
        )}
    </EmptyState>;
  }

  return (
    <div
      className={GRID_LAYOUTS[layout]}
    >
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}
