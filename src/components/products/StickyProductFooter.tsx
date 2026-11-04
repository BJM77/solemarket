'use client';

import { getProductUrl } from '@/lib/utils/url';
import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, ExternalLink } from 'lucide-react';
import { formatPrice } from "@/lib/utils/format";
import { OfferModal } from './OfferModal';
import { Product, UserProfile } from '@/lib/types';
import { cn } from "@/lib/utils/ui";;
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { useState, useEffect } from 'react';

interface StickyProductFooterProps {
    product: Product;
    user: UserProfile | null;
}

export function StickyProductFooter({ product, user }: StickyProductFooterProps) {
    const { addItem } = useCart();
    const { toast } = useToast();
    const router = useRouter();

    if (product.isDraft) return null;

    // Logic from ProductDetailsClient
    const handleBuyNow = () => {
        if (product?.externalUrl) {
            let url = product.externalUrl.trim();
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
            window.open(url, '_blank', 'noopener,noreferrer');
            return;
        }

        if (!user) {
            router.push(`/sign-in?redirect=${encodeURIComponent(product ? getProductUrl(product) : "/")}`);
            return;
        }

        // Allow staff/admins AND established buyers/sellers to bypass
        const role = (user as any).role;
        const isExempt = ['admin', 'superadmin', 'buyer', 'seller'].includes(role);
        const emailVerified = (user as any).emailVerified;

        if (!isExempt && !emailVerified) {
            toast({
                title: "Email Verification Required",
                description: "Please verify your email address to buy items.",
                variant: "destructive"
            });
            router.push('/verify');
            return;
        }

        addItem(product, 1);
        toast({
            title: "Added to Cart!",
            description: `${product.title} is now in your cart. Redirecting to checkout...`,
        });
        router.push('/checkout');
    };

    // If seller is viewing their own item, or if it's reverse bidding, hide standard buy buttons
    const userId = user?.id || (user as any)?.uid;
    if (product.isReverseBidding || userId === product.sellerId) {
        return null;
    }

    // If explicitly out of stock or sold, hide
    const qty = product.quantity ?? 1;
    if (qty <= 0 || product.status === 'sold') {
        return null;
    }

    return (
        <div
            data-testid="sticky-product-footer"
            className="fixed bottom-[4.5rem] left-0 right-0 z-40 bg-background/95 shadow-[0_-4px_16px_rgba(15,23,42,0.12)] backdrop-blur-xl border-t border-border p-3 hidden md:block lg:hidden"
        >
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
                <div className="flex flex-col">
                    {!product.isUntimed && (
                        <span className="text-lg font-black text-foreground">
                            ${formatPrice(product.price)}
                        </span>
                    )}
                    {product.isUntimed && (
                        <span className="text-sm font-medium text-muted-foreground">Make an offer</span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-1 justify-end">
                    {!product.isUntimed && (
                        <Button
                            size="lg"
                            className={cn("flex-1 font-bold h-12", product.externalUrl ? "bg-gradient-to-r from-orange-600 to-orange-600 text-white" : "")}
                            onClick={handleBuyNow}
                        >
                            {product.externalUrl ? (
                                <>
                                    <ExternalLink className="h-5 w-5 mr-2" />
                                    Buy on Facebook
                                </>
                            ) : (
                                <>
                                    <ShoppingCart className="h-5 w-5 mr-2" />
                                    Buy Now
                                </>
                            )}
                        </Button>
                    )}

                    {(product.isNegotiable || product.isUntimed) && (
                        <OfferModal
                            product={product}
                            user={user as any} // Cast because UserProfile mismatch in OfferModal types vs global types sometimes
                            trigger={
                                <Button
                                    size="lg"
                                    variant={product.isUntimed ? "default" : "outline"}
                                    className={cn(
                                        "flex-1 font-bold h-12",
                                        product.isUntimed && "bg-primary hover:bg-primary/90 text-primary-foreground"
                                    )}
                                >
                                    <DollarSign className="h-5 w-5 mr-2" />
                                    {product.isUntimed ? "Offer" : "Offer"}
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
