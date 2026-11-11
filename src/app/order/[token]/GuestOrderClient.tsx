'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bookmark, Copy, Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderPaymentInstructionsView, type PaymentDetails } from '@/components/orders/OrderPaymentInstructions';
import { cancelGuestOrderAction } from '@/app/actions/marketplace/guest-checkout';
import { formatPrice } from '@/lib/utils/format';
import { toMs } from '@/lib/checkout/holds';
import { saveGuestOrder, listGuestOrders, isLocalOrderActive, type LocalGuestOrder } from '@/lib/checkout/guest-orders-local';

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
    const [copied, setCopied] = useState(false);
    const [others, setOthers] = useState<LocalGuestOrder[]>([]);

    // Remember this order on this device ("Your active orders"), with its latest status.
    useEffect(() => {
        saveGuestOrder({
            token,
            title: order.item?.title || 'Your order',
            reference: order.paymentReference,
            totalAmount: order.totalAmount,
            createdAtMs: toMs((order as any).createdAt) || Date.now(),
            holdExpiresAtMs: toMs(order.holdExpiresAt),
            status: order.status,
        });
        setOthers(listGuestOrders().filter((o) => o.token !== token));
    }, [token, order]);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Copy failed. Bookmark this page instead.');
        }
    };

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

            <div className="space-y-3 rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 text-sm" data-testid="guest-save-link">
                <div className="flex items-start gap-2">
                    <Bookmark className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div>
                        <p className="font-bold">Save or bookmark this page</p>
                        <p className="text-foreground/80">
                            We don&apos;t send emails, so this private link is the only way back to your order. It&apos;s also remembered on this device under &quot;Your active orders&quot;. Don&apos;t share it.
                        </p>
                    </div>
                </div>
                <Button type="button" variant="outline" className="min-h-11 w-full font-bold sm:w-auto" onClick={copyLink} data-testid="copy-order-link">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Link copied' : 'Copy order link'}
                </Button>
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
                    <p>The seller has confirmed your payment. They&apos;ll contact you on the email or mobile you gave to arrange {order.shippingMethod === 'shipping' ? 'postage' : 'pickup'}.</p>
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
                <p className="font-bold">Your other orders on this device</p>
                {others.length === 0 ? (
                    <p className="text-muted-foreground">None yet.</p>
                ) : (
                    <ul className="space-y-1">
                        {others.slice(0, 5).map((o) => (
                            <li key={o.token}>
                                <Link href={`/order/${o.token}`} className="underline">{o.title}</Link>
                                <span className="text-muted-foreground"> · {isLocalOrderActive(o) ? 'on hold, awaiting payment' : o.status === 'cancelled' ? 'cancelled' : o.status === 'awaiting_payment' ? 'awaiting payment' : o.status || 'order'}</span>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-muted-foreground">
                    Want to track orders in one place? <Link href={signUpHref} className="font-bold text-foreground underline">Create a free account</Link> with {order.buyerEmail || 'the same email'}.
                </p>
            </div>
        </main>
    );
}
