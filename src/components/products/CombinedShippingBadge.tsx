'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Truck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { sellerHasOtherListings } from '@/app/actions/marketplace/shipping-settings';

const FULL_TEXT = 'Add another item from this seller and combine shipping free: you pay one shipping fee per seller, however many items you buy from them.';

/** Compact "Combine shipping" pill shown next to the Bronze/Silver/Gold badge. */
export function CombinedShippingBadge({ sellerId, productId }: { sellerId?: string; productId?: string }) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        let alive = true;
        if (!sellerId) return;
        sellerHasOtherListings(sellerId, productId).then(r => { if (alive) setShow(r); }).catch(() => {});
        return () => { alive = false; };
    }, [sellerId, productId]);
    if (!show || !sellerId) return null;
    return (
        <TooltipProvider delayDuration={150}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Link href={`/seller/${sellerId}`} data-testid="combined-shipping-badge" aria-label={FULL_TEXT} title={FULL_TEXT}
                        className="inline-flex w-fit items-center gap-1.5 rounded-full border border-orange-300 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-800 transition-colors hover:bg-orange-100 dark:border-orange-500/40 dark:bg-orange-500/10 dark:text-orange-300">
                        <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="sm:hidden">Combine shipping free</span>
                        <span className="hidden sm:inline">Add another from this seller, combine shipping free</span>
                    </Link>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs">{FULL_TEXT}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
