'use client';

import { Badge } from '@/components/ui/badge';
import { Calendar, Copyright, Hash } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface ProductHeaderProps {
  product: Product;
}

export function ProductHeader({ product }: ProductHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {product.category} {product.subCategory && `> ${product.subCategory}`}
        </Badge>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>

      <div className="flex items-center gap-3 mb-4">
        {!product.isUntimed && (
          <div className="text-4xl font-bold text-gray-900">
            ${formatPrice(product.price)}
          </div>
        )}
        {product.isUntimed && (
          <Badge className="text-lg py-1 px-3 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200">
            Make Offer
          </Badge>
        )}
      </div>

      <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
        {product.year && (
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>Year: {product.year}</span>
          </div>
        )}
        {product.manufacturer && (
          <div className="flex items-center gap-1.5">
            <Copyright className="w-4 h-4" />
            <span>{product.manufacturer}</span>
          </div>
        )}
        {product.cardNumber && (
          <div className="flex items-center gap-1.5">
            <Hash className="w-4 h-4" />
            <span>#{product.cardNumber}</span>
          </div>
        )}
      </div>

      <p className="text-gray-600 mt-4">{product.description}</p>
    </div>
  );
}
