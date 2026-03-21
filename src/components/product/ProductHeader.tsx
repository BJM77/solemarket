'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Copyright, Hash, Eye, Users } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ProductHeaderProps {
  product: Product;
}

export function ProductHeader({ product }: ProductHeaderProps) {
  // Simulate active viewers based on product's viewCount to create urgency
  const [activeViewers, setActiveViewers] = useState(1);

  useEffect(() => {
    // Generate a baseline between 2 and 6, scaling slightly with actual watchCount
    const baseViewers = Math.max(2, Math.floor((product.watchCount || 0) / 5) + 2);
    setActiveViewers(baseViewers);

    // Randomly fluctuate the viewer count every 15-30 seconds to look alive
    const interval = setInterval(() => {
      setActiveViewers(prev => {
        const fluctuation = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + fluctuation;
        return Math.max(1, Math.min(newCount, baseViewers + 4)); // Keep it realistic
      });
    }, Math.random() * 15000 + 15000);

    return () => clearInterval(interval);
  }, [product.watchCount]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <Badge variant="outline" className="text-xs">
          {product.category} {product.subCategory && `> ${product.subCategory}`}
        </Badge>
        <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground bg-white dark:bg-card px-3 py-1.5 rounded-full border shadow-sm">
          <div className="flex items-center gap-1.5 text-orange-600">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </div>
            <span>{activeViewers} viewing right now</span>
          </div>
          {/* Watching count removed per user request */}
          {/* {product.watchCount ? (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1">
                <HeartIcon className="w-3 h-3 text-red-500" />
                <span>{product.watchCount} watching</span>
              </div>
            </>
          ) : null} */}
        </div>
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

function HeartIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}
