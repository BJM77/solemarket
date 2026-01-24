
'use client';

import type { Product } from '@/lib/types';
import ProductCard from './ProductCard';
import EmptyState from '../ui/EmptyState';
import { Package, Upload } from 'lucide-react';
import { QuickView } from './QuickView';
import { Button } from '../ui/button';
import Link from 'next/link';
import { useUserPermissions } from '@/hooks/use-user-permissions';

export interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
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
      className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 xl:gap-x-8 mt-8"
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
