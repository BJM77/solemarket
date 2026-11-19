'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Layers, Check, ArrowRight, Loader2, Sparkles, Tag } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useTierSettings } from '@/hooks/use-tier-settings';
import { TIER_LABEL, tierGroupFor, tierOfferText, isBundleTier } from '@/lib/tier-bundles';
import { formatPrice } from '@/lib/utils/format';
import { productCoverStyle } from '@/lib/images/focal-point';
import type { Product } from '@/lib/types';
import type { FixedPriceBundle } from '@/types/bundles';

interface MultiDealSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product;
  eligibleProducts: Product[];
  bundle?: FixedPriceBundle | null;
  loading?: boolean;
}

export function MultiDealSelectionModal({
  open,
  onOpenChange,
  product,
  eligibleProducts,
  bundle,
  loading = false,
}: MultiDealSelectionModalProps) {
  const router = useRouter();
  const { items, addItem, setIsCartOpen } = useCart();
  const tierSettings = useTierSettings();
  const group = tierGroupFor(product.category);
  const tier = isBundleTier(product.multiCardTier) ? product.multiCardTier : null;

  const rule = group && tier && tierSettings[group] ? tierSettings[group][tier] : null;
  const quotaTarget = bundle?.quantity || rule?.quantity || 5;

  // Count items from this seller + tier currently in cart
  const inCartCount = items
    .filter((it) => it.sellerId === product.sellerId && (tier ? it.multiCardTier === tier : true))
    .reduce((sum, it) => sum + (it.quantity || 1), 0);

  const remainingQuota = Math.max(0, quotaTarget - inCartCount);

  const handleCheckoutNow = () => {
    onOpenChange(false);
    router.push('/checkout');
  };

  const handleViewCart = () => {
    onOpenChange(false);
    setIsCartOpen(true);
  };

  const handleAddCard = (p: Product) => {
    addItem(p, 1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Fill Your Multi-Buy Deal
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {tier ? `${TIER_LABEL[tier]} Bundle: ` : ''}
                {rule ? tierOfferText(rule) : bundle ? `${bundle.quantity} for $${bundle.price}` : 'Select items from this seller'}
                {' '}• <b>Held in your cart for 30 minutes</b>
              </DialogDescription>
            </div>
            {tier && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs uppercase font-black px-2.5 py-1">
                {TIER_LABEL[tier]}
              </Badge>
            )}
          </div>

          {/* Quota Progress Banner */}
          <div className="mt-4 p-3 bg-muted/60 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-foreground">
                {remainingQuota === 0 ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="h-4 w-4" /> Quota Reached! ({inCartCount} cards)
                  </span>
                ) : (
                  <span>
                    Add <b>{remainingQuota} more</b> card{remainingQuota > 1 ? 's' : ''} to reach the {quotaTarget}-card bundle deal!
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold" onClick={handleViewCart}>
                View Cart
              </Button>
              <Button size="sm" className="h-8 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleCheckoutNow}>
                Checkout Now <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Eligible Cards Grid */}
        <ScrollArea className="flex-1 p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              More eligible cards from {product.sellerName || 'this seller'}
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {eligibleProducts.length} available
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : eligibleProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No other cards currently available in this deal tier from this seller.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={handleCheckoutNow}>
                Proceed to Checkout
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {eligibleProducts.map((p) => {
                const isSelected = items.some((it) => it.id === p.id);
                return (
                  <div
                    key={p.id}
                    className="group border border-border/70 rounded-xl p-2.5 bg-card flex flex-col justify-between hover:border-primary/40 transition-colors"
                  >
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-muted">
                      {p.imageUrls?.[0] ? (
                        <Image
                          src={p.imageUrls[0]}
                          alt={p.title}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform"
                          style={productCoverStyle(p, 0)}
                        />
                      ) : null}
                    </div>
                    <div className="mt-2 min-w-0">
                      <p className="text-xs font-bold line-clamp-1 group-hover:text-primary transition-colors">
                        {p.title}
                      </p>
                      <p className="text-xs font-black text-primary mt-0.5">
                        ${formatPrice(p.price)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={isSelected ? "secondary" : "default"}
                      className={`w-full mt-2 h-8 text-[11px] font-bold ${
                        isSelected ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                      onClick={() => handleAddCard(p)}
                      disabled={isSelected}
                    >
                      {isSelected ? (
                        <>
                          <Check className="h-3 w-3 mr-1" /> Added
                        </>
                      ) : (
                        "+ Add Card"
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
