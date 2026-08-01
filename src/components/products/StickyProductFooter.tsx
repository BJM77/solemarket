'use client';

import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart, ExternalLink } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { OfferModal } from './OfferModal';
import { Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
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

    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            // Show sticky footer when user scrolls past 300px
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            router.push(`/sign-in?redirect=/product/${product?.id}`);
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
    // Consistent with ProductDetailsClient logic
    const userId = user?.id || (user as any)?.uid;
    if (product.isReverseBidding || userId === product.sellerId) {
        return null;
    }

    // If out of stock, hide
    if (!product.quantity || product.quantity <= 0) {
        return null;
    }

    return (
        <div className={cn(
            "fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 lg:hidden safe-area-pb transition-transform duration-300",
            isVisible ? "translate-y-0" : "translate-y-full"
        )}>
            <div className="flex items-center justify-between gap-3 max-w-md mx-auto">
                <div className="flex flex-col">
                    {!product.isUntimed && (
                        <span className="text-lg font-black text-white">
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
                            className={cn("flex-1 font-bold h-12", product.externalUrl ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" : "")}
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
                                        product.isUntimed && "bg-indigo-600 hover:bg-indigo-700 text-white"
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
