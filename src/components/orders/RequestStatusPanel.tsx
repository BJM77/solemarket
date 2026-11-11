'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, Handshake, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils/format';
import { toMs } from '@/lib/checkout/holds';
import { REQUEST_STATUS_LABEL, effectiveRequestStatus, formatWait, timeLeft, type RequestLike } from '@/lib/checkout/requests';
import { cancelGuestOrderAction, respondToCounterAction } from '@/app/actions/marketplace/guest-checkout';
import { buyerRequestAction } from '@/app/actions/marketplace/requests';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';

export type RequestPanelOrder = RequestLike & {
    id: string;
    requestStatus?: string | null;
    offerAmount?: number | null;
    counterAmount?: number | null;
    askingPrice?: number | null;
    declineReason?: string | null;
    totalAmount?: number;
    sellerName?: string | null;
    paymentMethod?: string;
    item?: { id: string; title: string } | null;
    items?: { id?: string; title?: string; quantity?: number }[];
};

/** Status chip text for a buyer (requests), or null for older orders. */
export function buyerRequestLabel(o: RequestPanelOrder): string | null {
    if (o?.stockMode !== 'request') return null;
    return REQUEST_STATUS_LABEL[effectiveRequestStatus(o)];
}

/**
 * The buyer's view of a seller-approved request: waiting, counter-offer (accept/decline),
 * declined, expired, relisted or cancelled. Accepted requests show the payment instructions
 * elsewhere; this adds the buyer's cancel button. Guests act with their order token.
 */
export function RequestStatusPanel({ order, guestToken, onChanged }: { order: RequestPanelOrder; guestToken?: string; onChanged?: () => void }) {
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    if (order?.stockMode !== 'request') return null;
    const st = effectiveRequestStatus(order);
    const seller = order.sellerName || 'The seller';
    const title = order.item?.title || order.items?.[0]?.title || 'this item';
    const listingId = order.item?.id || order.items?.[0]?.id;
    const left = timeLeft(order);

    const run = (action: 'accept_counter' | 'decline_counter' | 'buyer_cancel', confirmText?: string) => {
        if (confirmText && !confirm(confirmText)) return;
        setError(null);
        startTransition(async () => {
            let r: { success: boolean; error?: string };
            if (guestToken) {
                r = action === 'buyer_cancel'
                    ? await cancelGuestOrderAction(guestToken)
                    : await respondToCounterAction(guestToken, action === 'accept_counter');
            } else {
                const idToken = await getCurrentUserIdToken();
                if (!idToken) { setError('Please sign in again.'); return; }
                r = await buyerRequestAction(idToken, order.id, action);
            }
            if (!r.success) setError((r as any).error || 'Something went wrong.');
            onChanged?.();
        });
    };

    const cancelBtn = (label: string, confirmText: string) => (
        <Button variant="ghost" className="min-h-11 text-muted-foreground" disabled={pending} onClick={() => run('buyer_cancel', confirmText)} data-testid="request-cancel">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {label}
        </Button>
    );

    let body: React.ReactNode = null;
    if (st === 'pending') {
        body = (
            <div className="space-y-3" data-testid="request-pending">
                <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                    <div className="space-y-1">
                        <p className="font-bold">
                            {order.requestType === 'offer'
                                ? `Offer of $${formatPrice(Number(order.offerAmount))} sent to ${seller}`
                                : `Request sent to ${seller}`}
                        </p>
                        <p className="text-foreground/80">
                            {seller} will accept or decline{order.requestType === 'offer' ? ', or send a counter-offer' : ''}. Nothing is reserved yet, so please
                            don&apos;t pay until it&apos;s accepted.{left != null ? ` The request expires in ${formatWait(left)} if they don't reply.` : ''}
                        </p>
                    </div>
                </div>
                {cancelBtn('Cancel request', 'Cancel this request?')}
            </div>
        );
    } else if (st === 'countered') {
        body = (
            <div className="space-y-3" data-testid="request-countered">
                <div className="flex items-start gap-3">
                    <Handshake className="h-5 w-5 shrink-0 text-primary" aria-hidden />
                    <div className="space-y-1">
                        <p className="font-bold">{seller} countered with <span data-testid="counter-amount">${formatPrice(Number(order.counterAmount))}</span></p>
                        <p className="text-foreground/80">
                            You offered ${formatPrice(Number(order.offerAmount))}{order.askingPrice ? ` (asking $${formatPrice(Number(order.askingPrice))})` : ''}.
                            Accept to reserve {title} at this price{left != null ? `, within ${formatWait(left)}` : ''}.
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button className="min-h-11 font-bold" disabled={pending} onClick={() => run('accept_counter')} data-testid="counter-accept">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Accept ${formatPrice(Number(order.counterAmount))}
                    </Button>
                    <Button variant="outline" className="min-h-11" disabled={pending} onClick={() => run('decline_counter', 'Decline the counter-offer?')} data-testid="counter-decline">
                        Decline
                    </Button>
                </div>
            </div>
        );
    } else if (st === 'accepted') {
        body = (
            <div className="flex flex-wrap items-center justify-between gap-2" data-testid="request-accepted">
                <p className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="h-5 w-5" aria-hidden /> {seller} accepted. It&apos;s reserved for you.</p>
                {cancelBtn('Cancel', "Cancel this reserved item? Only do this if you haven't paid.")}
            </div>
        );
    } else if (st === 'paid') {
        return null;
    } else {
        const text = st === 'declined'
            ? (order.declineReason === 'sold_to_another_buyer' ? `${title} was reserved for another buyer, so this request was declined.`
                : order.declineReason === 'counter_declined' ? 'You declined the counter-offer.'
                : `${seller} declined this request.`)
            : st === 'expired' ? (order.status === 'countered' || (order as any).expiredFrom === 'countered' || order.counterAmount != null
                ? 'The counter-offer expired before it was accepted.'
                : `${seller} didn't reply within 24 hours, so this request expired.`)
            : st === 'seller_relisted' ? `${seller} relisted ${title}, so your reservation ended. Please don't pay for it now. If you already paid, contact the seller.`
            : order.cancelReason === 'cancelled_by_buyer' ? 'You cancelled this request.' : 'This request was cancelled.';
        body = (
            <div className="flex items-start gap-3" data-testid={`request-${st}`}>
                <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="space-y-1">
                    <p>{text}</p>
                    {listingId && <Link href={`/product/${listingId}`} className="font-bold underline">View the listing</Link>}
                </div>
            </div>
        );
    }

    return (
        <section aria-label="Request status" className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
            {body}
            {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
        </section>
    );
}

/** "Accepted 5 h 10 min ago" helper for seller and buyer views. */
export function sinceText(at: unknown): string | null {
    const ms = toMs(at);
    return ms == null ? null : formatWait(Date.now() - ms);
}
