'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, DollarSign, MessageSquare, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils/ui";
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
            {product.externalUrl ? (
              <div className="space-y-3">
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-extrabold bg-gradient-to-r from-orange-600 to-orange-600 hover:from-orange-700 hover:to-orange-700 text-white shadow-lg shadow-orange-900/20"
                  onClick={() => window.open(product.externalUrl, '_blank', 'noopener,noreferrer')}
                  disabled={!product.quantity || product.quantity === 0}
                >
                  <ExternalLink className="h-6 w-6 mr-2" />
                  Message / Buy on Facebook
                </Button>
                <div className="flex items-center justify-center gap-1.5 text-xs text-orange-600 font-semibold bg-orange-500/10 border border-orange-500/20 p-2.5 rounded-xl text-center">
                  <Badge className="bg-orange-600 text-white text-[9px] font-black uppercase px-1.5 py-0.5">Facebook</Badge>
                  Opens seller listing in a new window
                </div>
              </div>
            ) : (
              <>
                <Button
                  size="lg"
                  className="w-full h-16 text-lg font-bold bg-orange-600 hover:bg-orange-700 text-white"
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
              </>
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
