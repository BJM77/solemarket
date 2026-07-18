"use client";

import React from 'react';
import { useCart } from '@/context/CartContext';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
    SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Plus, Minus, ShoppingBag, Tag } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { calculateDutchAuctionPrice } from '@/lib/pricing';

export function CartDrawer() {
    const { items, removeItem, updateQuantity, cartSubtotal, cartTotal, itemCount, isCartOpen, setIsCartOpen } = useCart();

    const handleCheckout = () => {
        setIsCartOpen(false);
    };

    const originalSubtotal = items.reduce((total, item) => {
        let basePrice = item.price;
        if (item.isDutchAuction && item.dutchAuctionStartTime && item.dutchAuctionDropAmount && item.dutchAuctionIntervalHours && item.dutchAuctionFloorPrice !== undefined) {
            basePrice = calculateDutchAuctionPrice(
                item.price,
                item.dutchAuctionDropAmount,
                item.dutchAuctionIntervalHours,
                item.dutchAuctionFloorPrice,
                item.dutchAuctionStartTime
            );
        }
        return total + (basePrice * item.quantity);
    }, 0);

    const multibuySavings = originalSubtotal - cartSubtotal;

    return (
        <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
            <SheetContent className="w-full sm:max-w-lg flex flex-col">
                <SheetHeader className="px-6 pt-6">
                    <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                        <ShoppingBag className="w-5 h-5" />
                        Your Cart ({itemCount})
                    </SheetTitle>
                </SheetHeader>

                <Separator />

                {items.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <ShoppingBag className="w-16 h-16 text-muted-foreground opacity-30 mb-4" />
                        <h3 className="text-xl font-semibold">Your cart is empty</h3>
                        <p className="text-muted-foreground mt-2">Looks like you haven't added anything yet.</p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={() => setIsCartOpen(false)}
                        >
                            Continue Shopping
                        </Button>
                    </div>
                ) : (
                    <>
                        <ScrollArea className="flex-1 -mx-6 px-6">
                            <div className="space-y-6">
                                {items.map((item) => (
                                    <div key={item.id} className="flex gap-4">
                                        <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted shrink-0">
                                            <Image
                                                src={item.imageUrls[0]}
                                                alt={item.title}
                                                fill
                                                className="object-cover"
                                                sizes="96px"
                                            />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between py-1">
                                            <div>
                                                <h4 className="font-semibold line-clamp-2 leading-tight">{item.title}</h4>
                                                <p className="text-sm font-bold text-primary mt-1 flex items-baseline gap-1.5">
                                                    {(() => {
                                                        const groupedQuantity = items
                                                            .filter(i => i.multibuyEnabled && i.sellerId === item.sellerId && i.category === item.category && !i.dealId)
                                                            .reduce((sum, i) => sum + i.quantity, 0);

                                                        const applicableTier = item.multibuyEnabled && item.multibuyTiers
                                                            ? [...item.multibuyTiers]
                                                                .filter(t => groupedQuantity >= t.minQuantity)
                                                                .sort((a, b) => b.minQuantity - a.minQuantity)[0]
                                                            : null;

                                                        if (applicableTier) {
                                                            const discountedPrice = item.price * (1 - applicableTier.discountPercent / 100);
                                                            return (
                                                                <>
                                                                    <span className="text-indigo-600 dark:text-indigo-400">${formatPrice(discountedPrice)}</span>
                                                                    <span className="text-xs text-muted-foreground line-through font-normal">${formatPrice(item.price)}</span>
                                                                </>
                                                            );
                                                        }
                                                        return <span>${formatPrice(item.price)}</span>;
                                                    })()}
                                                </p>
                                                {/* Multibuy Info/Upsell Message */}
                                                {(() => {
                                                    if (!item.multibuyEnabled || !item.multibuyTiers?.length) return null;

                                                    const groupedQuantity = items
                                                        .filter(i => i.multibuyEnabled && i.sellerId === item.sellerId && i.category === item.category && !i.dealId)
                                                        .reduce((sum, i) => sum + i.quantity, 0);

                                                    const applicableTier = [...item.multibuyTiers]
                                                        .filter(t => groupedQuantity >= t.minQuantity)
                                                        .sort((a, b) => b.minQuantity - a.minQuantity)[0];

                                                    const nextTier = item.multibuyTiers
                                                        .sort((a, b) => a.minQuantity - b.minQuantity)
                                                        .find(t => t.minQuantity > groupedQuantity);

                                                    return (
                                                        <div className="space-y-1 mt-1.5">
                                                            {applicableTier && (
                                                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                                                                    <Tag className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" />
                                                                    {applicableTier.discountPercent}% Multibuy Saved
                                                                </span>
                                                            )}
                                                            {nextTier && (
                                                                <p className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-1">
                                                                    <Tag className="w-3 h-3" />
                                                                    Add {nextTier.minQuantity - groupedQuantity} more for {nextTier.discountPercent}% off!
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                    >
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <span className="text-sm font-medium w-5 text-center">{item.quantity}</span>
                                                    <Button
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeItem(item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        <SheetFooter className="px-6 pb-6 pt-4 mt-auto border-t">
                            <div className="w-full space-y-4">
                                <div className="space-y-1.5">
                                    {multibuySavings > 0 && (
                                        <div className="flex justify-between text-sm text-slate-500">
                                            <span>Subtotal</span>
                                            <span className="line-through">${formatPrice(originalSubtotal)}</span>
                                        </div>
                                    )}
                                    {multibuySavings > 0 && (
                                        <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
                                            <span>Multibuy Savings</span>
                                            <span>-${formatPrice(multibuySavings)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black">
                                        <span>Total Subtotal</span>
                                        <span className="text-primary">${formatPrice(cartSubtotal)}</span>
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground text-center">
                                    Shipping and taxes will be calculated at checkout.
                                </p>
                                <Button size="lg" className="w-full" asChild>
                                    <Link href="/checkout" onClick={handleCheckout}>Proceed to Checkout</Link>
                                </Button>
                            </div>
                        </SheetFooter>
                    </>
                )}
            </SheetContent>
        </Sheet>
    );
}
