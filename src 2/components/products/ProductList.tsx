
'use client';

import type { Product } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '../ui/button';
import EmptyState from '../ui/EmptyState';
import { Package } from 'lucide-react';
import { formatPrice, getProductUrl } from '@/lib/utils';

interface ProductListProps {
  products: Product[];
}

export default function ProductList({ products }: ProductListProps) {
  if (!products || products.length === 0) {
    return <EmptyState
      icon={<Package className="h-12 w-12 text-muted-foreground" />}
      title="No Products Found"
      description="Try adjusting your search or filters to find what you're looking for."
    />;
  }

  return (
    <div className="border rounded-lg mt-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Seller</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted">
                  <Image src={product.imageUrls[0]} alt={product.title} fill className="object-cover" />
                </div>
              </TableCell>
              <TableCell className="font-medium">{product.title}</TableCell>
              <TableCell>
                <Badge variant="outline">{product.condition}</Badge>
              </TableCell>
              <TableCell>{product.sellerName}</TableCell>
              <TableCell className="text-right font-semibold">${formatPrice(product.price)}</TableCell>
              <TableCell className="text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href={getProductUrl(product)}>View</Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
