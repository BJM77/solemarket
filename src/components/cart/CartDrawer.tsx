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
import { Trash2, Plus, Minus, ShoppingBag, Tag, Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice } from "@/lib/utils/format";
import { bundleProgress, isLineEligible, type BundleProgress, type PricedLine } from '@/lib/bundles';
import { cartItemsToLines } from '@/lib/order-pricing';

export function CartDrawer() {
    const { items, removeItem, updateQuantity, cartSubtotal, cartTotal, itemCount, isCartOpen, setIsCartOpen, pricing, bundles } = useCart();

    const handleCheckout = () => {
        setIsCartOpen(false);
    };

    // All numbers come from the shared pricing engine (same one the server uses at checkout).
    const originalSubtotal = pricing.originalSubtotal;
    const lines = cartItemsToLines(items as any);
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
                                {items.map((item, idx) => (
                                    <div key={`${item.id}-${(item as any).dealId || ''}`} className="flex gap-4">
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
                                                <CartLinePrice line={pricing.lines[idx]} unitPrice={lines[idx]?.unitPrice ?? item.price} />
                                                <CartLineOffers
                                                    item={item}
                                                    line={pricing.lines[idx]}
                                                    progress={bundles.filter(b => isLineEligible(b, lines[idx])).map(b => bundleProgress(b, lines))}
                                                    groupedQuantity={items
                                                        .filter(i => i.multibuyEnabled && i.sellerId === item.sellerId && i.category === item.category && !(i as any).dealId)
                                                        .reduce((sum, i) => sum + i.quantity, 0)}
                                                />
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
                                            <span>Bundle &amp; Multibuy Savings</span>
                                            <span>-${formatPrice(multibuySavings)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-lg font-black">
                                        <span>Total Subtotal</span>
                                        <span className="text-primary">${formatPrice(cartSubtotal)}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                            Pay the seller directly
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                            Cash on pickup (Perth) or the seller's PayID. Benched never holds your money.
                                        </p>
                                    </div>
                                </div>
                                <Button size="lg" className="w-full font-bold uppercase tracking-wider" asChild>
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

function CartLinePrice({ line, unitPrice }: { line?: PricedLine; unitPrice: number }) {
    if (!line) return <p className="text-sm font-bold text-primary mt-1">${formatPrice(unitPrice)}</p>;
    const each = line.total / line.quantity;
    const discounted = line.total < line.originalTotal - 0.004;
    return (
        <p className="text-sm font-bold text-primary mt-1 flex items-baseline gap-1.5" data-testid="cart-line-price">
            {discounted ? (
                <>
                    <span className="text-indigo-600 dark:text-indigo-400">${formatPrice(each)}{line.quantity > 1 ? ' ea' : ''}</span>
                    <span className="text-xs text-muted-foreground line-through font-normal">${formatPrice(unitPrice)}</span>
                </>
            ) : (
                <span>${formatPrice(unitPrice)}</span>
            )}
        </p>
    );
}

function CartLineOffers({ item, line, progress, groupedQuantity }: { item: any; line?: PricedLine; progress: BundleProgress[]; groupedQuantity: number }) {
    const tiers = (item.multibuyEnabled && item.multibuyTiers?.length) ? [...item.multibuyTiers].sort((a: any, b: any) => a.minQuantity - b.minQuantity) : [];
    const nextTier = tiers.find((t: any) => t.minQuantity > groupedQuantity);
    if (!progress.length && !tiers.length) return null;
    return (
        <div className="space-y-1 mt-1.5">
            {progress.map(p => (
                <span key={p.bundle.id} data-testid="cart-bundle-progress"
                    className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${p.remaining === p.bundle.quantity && p.eligibleInCart > 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}`}>
                    <Package className="w-2.5 h-2.5" aria-hidden />
                    {p.bundle.name}: {p.label}
                </span>
            ))}
            {line && line.multibuyPercent > 0 && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Tag className="w-2.5 h-2.5 text-emerald-500 dark:text-emerald-400" aria-hidden />
                    {line.multibuyPercent}% Multibuy Saved
                </span>
            )}
            {nextTier && (
                <p className="text-[10px] font-semibold text-blue-600 flex items-center gap-1 mt-1">
                    <Tag className="w-3 h-3" aria-hidden />
                    Add {nextTier.minQuantity - groupedQuantity} more for {Math.min(90, nextTier.discountPercent)}% off!
                </p>
            )}
        </div>
    );
}
