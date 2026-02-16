"use client";

import { Button } from "@/components/ui/button";
import { OfferModal } from "@/components/products/OfferModal";
import { ShoppingCart, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, UserProfile } from "@/lib/types";
import type { User } from "firebase/auth";

interface StickyProductFooterProps {
    product: Product;
    user: User | null;
    onAddToCart: () => void;
    isOwner: boolean;
}

export function StickyProductFooter({ product, user, onAddToCart, isOwner }: StickyProductFooterProps) {
    // Logic to determine if we should show the footer
    const canBuy = !product.isReverseBidding && !isOwner && product.quantity && product.quantity > 0;
    const canOffer = !product.isReverseBidding && !isOwner && (product.isNegotiable || product.isUntimed);

    if (!canBuy && !canOffer) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-gray-200 p-4 lg:hidden pb-[env(safe-area-inset-bottom)]">
            <div className="flex gap-3 max-w-md mx-auto">
                {canBuy && !product.isUntimed && (
                    <Button
                        size="lg"
                        className="flex-1 font-bold shadow-lg"
                        onClick={onAddToCart}
                    >
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Buy Now
                    </Button>
                )}

                {canOffer && (
                    <OfferModal
                        product={product}
                        user={user}
                        trigger={
                            <Button
                                size="lg"
                                variant={product.isUntimed ? "default" : "outline"}
                                className={cn(
                                    "flex-1 font-bold shadow-sm",
                                    product.isUntimed && "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                )}
                            >
                                <DollarSign className="h-5 w-5 mr-2" />
                                {product.isUntimed ? "Make Offer" : "Make Offer"}
                            </Button>
                        }
                    />
                )}
            </div>
        </div>
    );
}
