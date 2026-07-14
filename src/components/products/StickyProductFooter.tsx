'use client';

import { Button } from '@/components/ui/button';
import { DollarSign, ShoppingCart } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { OfferModal } from './OfferModal';
import { Product, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface StickyProductFooterProps {
    product: Product;
    user: UserProfile | null;
}

export function StickyProductFooter({ product, user }: StickyProductFooterProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { addItem } = useCart();

    if (product.isDraft) return null;

    // Logic from ProductDetailsClient
    const handleBuyNow = () => {
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 p-4 lg:hidden safe-area-pb">
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
                            className="flex-1 font-bold h-12"
                            onClick={handleBuyNow}
                        >
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Buy
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
