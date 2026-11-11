'use client';

import { useState, useTransition } from 'react';
import { Check, Clock, Handshake, Loader2, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { formatPrice } from '@/lib/utils/format';
import { acceptedWait, effectiveRequestStatus, formatWait, timeLeft } from '@/lib/checkout/requests';
import { relistRequestAction, respondToRequestAction } from '@/app/actions/marketplace/requests';
import { markOrderCollected, markOrderPaid } from '@/app/actions/marketplace/order-payments';

/**
 * Seller controls for a purchase request (orders with stockMode 'request'):
 * pending -> Accept / Decline / (offers) Counter; accepted -> waiting time, nudge, Mark paid,
 * Mark collected, Relist. Every action is a server action (Admin SDK, transaction).
 */
export function SellerRequestActions({ order }: { order: any }) {
    const { toast } = useToast();
    const [pending, startTransition] = useTransition();
    const [counter, setCounter] = useState('');
    const [showCounter, setShowCounter] = useState(false);
    const st = effectiveRequestStatus(order);
    const isOffer = order.requestType === 'offer';
    const asking = Number(order.askingPrice ?? order.items?.[0]?.price ?? 0);
    const ref = order.paymentReference || order.payIdReference;

    const run = (label: string, fn: (idToken: string) => Promise<{ success: boolean; error?: string }>, confirmText?: string) => {
        if (confirmText && !confirm(confirmText)) return;
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;
            const r = await fn(idToken);
            if (r.success) toast({ title: label });
            else toast({ title: 'Error', description: (r as any).error, variant: 'destructive' });
        });
    };

    const summary = (
        <p className="text-xs text-slate-600">
            {isOffer
                ? <>Offer <b className="text-slate-900">${formatPrice(Number(order.offerAmount))}</b> (you asked ${formatPrice(asking)})</>
                : <>Buy at your price <b className="text-slate-900">${formatPrice(Number(order.subtotal ?? asking))}</b></>}
            {' · '}{order.paymentMethod === 'cash' ? 'cash on pickup' : 'PayID'}{order.shippingMethod === 'shipping' ? ', posted' : ', pickup'}
            {ref ? <> · Ref <span className="font-mono font-bold">{ref}</span></> : null}
        </p>
    );

    if (st === 'pending') {
        const left = timeLeft(order);
        return (
            <div className="space-y-2" data-testid="seller-request-actions">
                {summary}
                {left != null && <p className="flex items-center gap-1 text-xs font-bold text-amber-700"><Clock className="h-3.5 w-3.5" /> Expires in {formatWait(left)} if you don&apos;t reply</p>}
                <p className="text-[11px] text-slate-500">Still listed for everyone until you accept. Accepting reserves it for this buyer and shows them how to pay.</p>
                <Button className="w-full min-h-11 font-bold rounded-xl gap-2" disabled={pending} data-testid="seller-request-accept"
                    onClick={() => run('Accepted: reserved for this buyer', (t) => respondToRequestAction(t, order.id, 'accept'))}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept{isOffer ? ` $${formatPrice(Number(order.offerAmount))}` : ''}
                </Button>
                {isOffer && order.counterAmount == null && (
                    showCounter ? (
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); run('Counter-offer sent', (t) => respondToRequestAction(t, order.id, 'counter', Number(counter))); }}>
                            <Input type="number" inputMode="decimal" step="0.01" min={1} placeholder={`$${formatPrice(Number(order.offerAmount))}–$${formatPrice(asking)}`} value={counter} onChange={(e) => setCounter(e.target.value)} className="h-11 rounded-xl" aria-label="Counter-offer amount" data-testid="seller-counter-amount" />
                            <Button type="submit" className="min-h-11 rounded-xl font-bold" disabled={pending || !counter} data-testid="seller-counter-send">Send</Button>
                        </form>
                    ) : (
                        <Button variant="outline" className="w-full min-h-11 font-bold rounded-xl gap-2" disabled={pending} onClick={() => setShowCounter(true)} data-testid="seller-request-counter">
                            <Handshake className="h-4 w-4" /> Decline with a counter-offer
                        </Button>
                    )
                )}
                <Button variant="ghost" className="w-full min-h-11 text-slate-500 gap-2" disabled={pending} data-testid="seller-request-decline"
                    onClick={() => run('Request declined', (t) => respondToRequestAction(t, order.id, 'decline'), 'Decline this request?')}>
                    <X className="h-4 w-4" /> Decline
                </Button>
            </div>
        );
    }

    if (st === 'countered') {
        const left = timeLeft(order);
        return (
            <div className="space-y-1" data-testid="seller-request-countered">
                {summary}
                <p className="text-xs font-bold text-sky-800">You countered with ${formatPrice(Number(order.counterAmount))}. Waiting for the buyer{left != null ? ` (${formatWait(left)} left)` : ''}.</p>
            </div>
        );
    }

    if (st === 'accepted') {
        const w = acceptedWait(order);
        const isCash = order.paymentMethod === 'cash';
        return (
            <div className="space-y-2" data-testid="seller-payment-actions">
                {summary}
                <p className="text-xs text-slate-700" data-testid="seller-request-waiting">
                    Reserved for this buyer. Waiting {formatWait(w.waitingMs)} for {isCash ? 'collection' : 'payment'}.
                </p>
                {w.nudge && (
                    <p className="rounded-lg bg-amber-50 p-2 text-xs font-bold text-amber-800" data-testid="seller-request-nudge">
                        It&apos;s been over {w.nudgeAfterHours} hours. Contact the buyer, or relist it if they&apos;ve gone quiet.
                    </p>
                )}
                {!isCash && (
                    <Button className="w-full min-h-11 font-bold rounded-xl" disabled={pending} data-testid="seller-mark-paid"
                        onClick={() => run('Marked as paid', (t) => markOrderPaid(t, order.id))}>
                        Mark as paid
                    </Button>
                )}
                {order.shippingMethod === 'pickup' && (
                    <Button variant={isCash ? 'default' : 'outline'} className="w-full min-h-11 font-bold rounded-xl" disabled={pending}
                        onClick={() => run('Marked as collected', (t) => markOrderCollected(t, order.id))}>
                        {isCash ? 'Mark collected (cash received)' : 'Mark collected'}
                    </Button>
                )}
                <Button variant="ghost" className="w-full min-h-11 text-slate-500 gap-2" disabled={pending} data-testid="seller-relist"
                    onClick={() => run('Relisted: back on sale', (t) => relistRequestAction(t, order.id), "Relist this item? The buyer's reservation ends and it goes back on sale.")}>
                    <RotateCcw className="h-4 w-4" /> Relist
                </Button>
            </div>
        );
    }

    const text = st === 'declined'
        ? (order.declineReason === 'sold_to_another_buyer' ? 'Declined automatically: you accepted another request for the last one.'
            : order.declineReason === 'counter_declined' ? 'The buyer declined your counter-offer.' : 'You declined this request.')
        : st === 'expired' ? 'Expired with no answer.'
        : st === 'seller_relisted' ? 'You relisted this item.'
        : st === 'cancelled' ? (order.cancelReason === 'cancelled_by_buyer' ? 'The buyer cancelled.' : 'Cancelled.')
        : null;
    return text ? <div className="space-y-1">{summary}<p className="text-xs text-slate-500">{text}</p></div> : null;
}
