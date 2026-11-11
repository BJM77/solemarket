'use client';

import { useEffect, useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderPaymentInstructionsView, type PaymentDetails } from '@/components/orders/OrderPaymentInstructions';
import { cancelGuestOrderAction } from '@/app/actions/marketplace/guest-checkout';
import { formatPrice } from '@/lib/utils/format';

type GuestOrder = PaymentDetails & {
    cancelReason?: string | null;
    subtotal?: number;
    shippingCost?: number;
    shippingMethod?: string;
    buyerName?: string;
    buyerEmail?: string;
    item: { id: string; title: string; image?: string; price: number; quantity: number } | null;
};

const STATUS: Record<string, { label: string; tone: string }> = {
    awaiting_payment: { label: 'Waiting for your PayID payment', tone: 'bg-amber-100 text-amber-800' },
    paid: { label: 'Paid: the seller confirmed your payment', tone: 'bg-emerald-100 text-emerald-800' },
    completed: { label: 'Completed', tone: 'bg-emerald-100 text-emerald-800' },
    shipped: { label: 'Shipped', tone: 'bg-emerald-100 text-emerald-800' },
    delivered: { label: 'Delivered', tone: 'bg-emerald-100 text-emerald-800' },
    processing: { label: 'Processing', tone: 'bg-amber-100 text-amber-800' },
    cancelled: { label: 'Cancelled', tone: 'bg-slate-200 text-slate-700' },
};

export default function GuestOrderClient({ token, order }: { token: string; order: GuestOrder }) {
    const router = useRouter();
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // Pick up the seller marking it paid (or the hold ending) without a manual reload.
    useEffect(() => {
        if (order.status !== 'awaiting_payment') return;
        const id = setInterval(() => router.refresh(), 30_000);
        return () => clearInterval(id);
    }, [order.status, router]);

    const status = STATUS[order.status] || { label: order.status, tone: 'bg-slate-200 text-slate-700' };
    const cancelledText = order.cancelReason === 'payment_timeout'
        ? 'Your 30-minute hold ended before the seller confirmed a payment, so the item went back on sale.'
        : order.cancelReason === 'cancelled_by_buyer' ? 'You cancelled this order.' : 'This order was cancelled.';
    const signUpHref = `/sign-up?email=${encodeURIComponent(order.buyerEmail || '')}`;

    return (
        <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="guest-order-page">
            <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Order {order.paymentReference}</p>
                <h1 className="text-2xl font-black">Thanks{order.buyerName ? `, ${order.buyerName.split(' ')[0]}` : ''}!</h1>
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${status.tone}`} data-testid="guest-order-status">{status.label}</span>
            </div>

            {order.item && (
                <div className="flex items-center gap-4 rounded-2xl border bg-card p-4">
                    {order.item.image && (
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                            <Image src={order.item.image} alt={order.item.title} fill className="object-cover" sizes="64px" />
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-bold">{order.item.title}</p>
                        <p className="text-xs text-muted-foreground">
                            Sold by {order.sellerName || 'the seller'} · {order.shippingMethod === 'shipping' ? 'Posted to you' : 'Pickup in Perth (the seller will contact you)'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-lg font-black">${formatPrice(order.totalAmount)}</p>
                        {!!order.shippingCost && <p className="text-[11px] text-muted-foreground">incl. ${formatPrice(order.shippingCost)} postage</p>}
                    </div>
                </div>
            )}

            {order.status === 'awaiting_payment' && (
                <>
                    <OrderPaymentInstructionsView d={order} guest onExpire={() => router.refresh()} />
                    {order.holdActive && (
                        <div className="text-center">
                            <Button
                                variant="ghost"
                                className="text-muted-foreground"
                                disabled={pending}
                                onClick={() => {
                                    if (!confirm("Cancel this order? Only do this if you haven't paid.")) return;
                                    setError(null);
                                    startTransition(async () => {
                                        const r = await cancelGuestOrderAction(token);
                                        if (!r.success) setError(r.error);
                                        router.refresh();
                                    });
                                }}
                            >
                                {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} I changed my mind, cancel this order
                            </Button>
                            {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
                        </div>
                    )}
                </>
            )}

            {['paid', 'completed', 'shipped', 'delivered', 'processing'].includes(order.status) && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
                    <p>The seller has confirmed your payment. They&apos;ll contact you by email or mobile to arrange {order.shippingMethod === 'shipping' ? 'postage' : 'pickup'}.</p>
                </div>
            )}

            {order.status === 'cancelled' && (
                <div className="flex items-start gap-3 rounded-2xl border bg-muted p-4 text-sm">
                    <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="space-y-2">
                        <p>{cancelledText}</p>
                        {order.item && <Link href={`/product/${order.item.id}`} className="font-bold underline">View the listing</Link>}
                    </div>
                </div>
            )}

            <div className="space-y-2 rounded-2xl border bg-card p-4 text-sm">
                <p className="font-bold">Keep this page</p>
                <p className="text-muted-foreground">
                    This private link is the only way to see this order without an account, and we&apos;ve emailed it to you too. Don&apos;t share it.
                </p>
                <p className="text-muted-foreground">
                    Want to track orders in one place? <Link href={signUpHref} className="font-bold text-foreground underline">Create a free account</Link> with {order.buyerEmail || 'the same email'}.
                </p>
            </div>
        </main>
    );
}
