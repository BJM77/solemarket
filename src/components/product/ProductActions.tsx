'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, ShoppingCart, DollarSign, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OfferModal } from '@/components/products/OfferModal';
import { BiddingInterface } from '@/components/products/BiddingInterface';
import type { Product } from '@/lib/types';

interface ProductActionsProps {
  product: Product;
  user: any;
  onAddToCart: () => void;
  onAcceptBid: (bidId: string) => Promise<void>;
}

export function ProductActions({ product, user, onAddToCart, onAcceptBid }: ProductActionsProps) {
  return (
    <div className="space-y-6">
      {(product.quantity && product.quantity > 0) ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <span className="font-semibold">In Stock</span>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <span className="font-semibold">Out of Stock</span>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 pt-4 border-t">
        {(!product.isReverseBidding || user?.uid === product.sellerId) && (
          <div className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => {
                const messageButton = document.querySelector('[data-message-seller-btn]') as HTMLButtonElement;
                if (messageButton) messageButton.click();
                else window.location.href = `/product/${product.id}#message-seller`;
              }}
              disabled={!product.quantity || product.quantity === 0}
            >
              <MessageSquare className="h-6 w-6 mr-2" />
              Message Seller to Buy
            </Button>
            
            {(product.isNegotiable || product.isUntimed) && (
              <OfferModal
                product={product}
                user={user}
                trigger={
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full h-14 text-lg font-bold border-2"
                  >
                    <DollarSign className="h-6 w-6 mr-2" />
                    Make an Offer
                  </Button>
                }
              />
            )}
          </div>
        )}
      </div>

      {product.isReverseBidding && user && (
        <BiddingInterface
          product={product}
          user={user}
          onAcceptBid={onAcceptBid}
        />
      )}
    </div>
  );
}
