'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getOrderPaymentDetails } from '@/app/actions/marketplace/order-payments';
import { formatPrice } from '@/lib/utils/format';
import { HoldCountdown } from '@/components/checkout/HoldCountdown';

/** Shape shared by signed-in orders (getOrderPaymentDetails) and guest orders (order token page). */
export interface PaymentDetails {
    id: string;
    status: string;
    paymentMethod: string;
    paymentReference: string;
    paymentDueAt?: string | null;
    holdExpiresAt?: string | null;
    stockMode?: string | null;
    holdActive?: boolean;
    totalAmount: number;
    sellerName?: string | null;
    payId: { payId: string; payIdType?: string | null; accountName?: string | null } | null;
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    const [copied, setCopied] = useState(false);
    return (
        <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
            <div className="flex items-center justify-between gap-3">
                <p className={`break-all text-xl font-black text-foreground ${mono ? 'font-mono' : ''}`} data-testid={`pay-${label.toLowerCase().replace(/\s+/g, '-')}`}>{value}</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="min-h-11 shrink-0 gap-1"
                    aria-label={`Copy ${label}`}
                    onClick={async () => {
                        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
                    }}
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy'}
                </Button>
            </div>
        </div>
    );
}

/** Payment instructions for one order (PayID or Perth cash pickup), shown to the buyer only. */
export function OrderPaymentInstructions({ orderId }: { orderId: string }) {
    const [d, setD] = useState<PaymentDetails | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error('Sign in to see payment details.');
                const res = await getOrderPaymentDetails(token, orderId);
                if (!cancelled) setD(res as PaymentDetails);
            } catch (e: any) {
                if (!cancelled) setErr(e?.message || 'Could not load payment details.');
            }
        })();
        return () => { cancelled = true; };
    }, [orderId]);

    if (err) return <p className="text-sm text-rose-600">{err}</p>;
    if (!d) return <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading payment details" />;
    return <OrderPaymentInstructionsView d={d} />;
}

/**
 * The instructions themselves. `guest` hides links that need an account (messages).
 * Hold-model PayID orders show a live 30-minute countdown; when it runs out the PayID is hidden.
 */
export function OrderPaymentInstructionsView({ d, guest = false, onExpire }: { d: PaymentDetails; guest?: boolean; onExpire?: () => void }) {
    const [copiedAll, setCopiedAll] = useState(false);
    const [expired, setExpired] = useState(false);
    if (d.status !== 'awaiting_payment') return null;
    const isHold = d.stockMode === 'hold' || (!!d.holdExpiresAt && d.stockMode !== 'request');
    const isRequest = d.stockMode === 'request';
    const holdOver = isHold && (expired || d.holdActive === false);

    const due = d.paymentDueAt ? new Date(d.paymentDueAt).toLocaleString('en-AU', { timeZone: 'Australia/Perth', dateStyle: 'medium', timeStyle: 'short' }) : null;
    const reportHref = `/contact?topic=order-problem&ref=${encodeURIComponent(d.paymentReference || d.id)}`;

    if (d.paymentMethod === 'payid' && holdOver) {
        return (
            <section aria-label="Hold expired" className="space-y-2 rounded-2xl border-2 border-rose-500/50 bg-rose-500/5 p-5" data-testid="hold-expired">
                <h3 className="text-lg font-black text-foreground">Your 30-minute hold has ended</h3>
                <p className="text-sm text-foreground/80">
                    Please don&apos;t pay now. The item has been released for other buyers. If it&apos;s still listed you can buy it again.
                    If you already paid, the seller can still confirm your payment, or <Link href={reportHref} className="underline">contact us</Link>.
                </p>
            </section>
        );
    }

    return (
        <section aria-label="Payment instructions" className="space-y-4 rounded-2xl border-2 border-primary bg-primary/5 p-5">
            {d.paymentMethod === 'payid' ? (
                <>
                    {isHold && d.holdExpiresAt && (
                        <HoldCountdown
                            expiresAt={d.holdExpiresAt}
                            label="Pay within"
                            onExpire={() => { setExpired(true); onExpire?.(); }}
                        />
                    )}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                            <div>
                                <h3 className="text-lg font-black text-foreground">Pay {d.sellerName || 'the seller'} by PayID</h3>
                                <p className="text-sm text-foreground/80">
                                    Transfer the exact amount from your banking app using the PayID and reference below.
                                    {isRequest
                                        ? ' The seller accepted your request and reserved it for you. Please pay soon: if payment takes too long, they can relist it.'
                                        : isHold
                                        ? ' The item is held for you for 30 minutes. Pay before the timer runs out or it goes back on sale.'
                                        : due ? ` Pay by ${due} (Perth time) or the items are released.` : ''}
                                </p>
                            </div>
                        </div>
                        {d.payId && (
                            <Button
                                type="button"
                                size="sm"
                                className="min-h-11 gap-1.5 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
                                data-testid="copy-all-payid-btn"
                                onClick={async () => {
                                    const summary = [
                                        `PayID: ${d.payId!.payId}`,
                                        d.payId!.accountName ? `Account Name: ${d.payId!.accountName}` : null,
                                        `Amount: $${formatPrice(d.totalAmount)} AUD`,
                                        `Reference: ${d.paymentReference}`,
                                    ].filter(Boolean).join('\n');
                                    try {
                                        await navigator.clipboard.writeText(summary);
                                        setCopiedAll(true);
                                        setTimeout(() => setCopiedAll(false), 2000);
                                    } catch { /* ignore */ }
                                }}
                            >
                                {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                {copiedAll ? 'Copied All Details' : 'Copy PayID + Reference'}
                            </Button>
                        )}
                    </div>
                    {d.payId ? (
                        <div className="grid gap-3">
                            <CopyRow label="Amount" value={`$${formatPrice(d.totalAmount)}`} />
                            <CopyRow label="PayID" value={d.payId.payId} />
                            {d.payId.accountName && <CopyRow label="Account name" value={d.payId.accountName} />}
                            <CopyRow label="Reference" value={d.paymentReference} mono />
                        </div>
                    ) : (
                        <p className="text-sm text-amber-700">The seller&apos;s PayID isn&apos;t available. Please <Link href={reportHref} className="underline">contact us</Link>.</p>
                    )}
                    <ol className="list-decimal space-y-1 pl-5 text-sm text-foreground/80">
                        <li>Open your banking app and choose Pay to PayID.</li>
                        <li>Check the name your bank shows matches the account name above before you confirm.</li>
                        <li>Put the reference in the description so the seller can match your payment.</li>
                        <li>The seller marks the order as paid when the money arrives; {guest ? 'this page will then show Paid' : "you'll get a notification"}.</li>
                    </ol>
                </>
            ) : (
                <div className="flex items-start gap-3" data-testid="pay-cash">
                    <MapPin className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                    <div className="space-y-2 text-sm text-foreground/80">
                        <h3 className="text-lg font-black text-foreground">Cash on pickup in Perth</h3>
                        <p>
                            {guest
                                ? `${d.sellerName || 'The seller'} will contact you on the email or mobile you gave to arrange a pickup time and a safe, public place`
                                : `Message ${d.sellerName || 'the seller'} to arrange a pickup time and a safe, public place`}
                            {isRequest ? ' soon (the seller can relist it if pickup takes too long)' : due ? ` before ${due} (Perth time)` : ' within 72 hours'}. Bring <b>${formatPrice(d.totalAmount)}</b> in cash,
                            inspect the item, then pay. Quote reference <b className="font-mono">{d.paymentReference}</b>.
                        </p>
                        {!guest && <Button asChild variant="outline" className="min-h-11"><Link href="/messages">Message the seller</Link></Button>}
                    </div>
                </div>
            )}
            <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden />
                <p>
                    Only pay to the PayID shown here, with this reference. Never pay a different PayID or bank account sent by message,
                    email or text, even if it looks like it&apos;s from the seller or Benched.{' '}
                    <Link href={reportHref} className="font-bold underline">Report a problem</Link>
                </p>
            </div>
        </section>
    );
}
