'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Copy, Loader2, MapPin, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getOrderPaymentDetails } from '@/app/actions/marketplace/order-payments';
import { formatPrice } from '@/lib/utils/format';

type Details = Awaited<ReturnType<typeof getOrderPaymentDetails>>;

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
    const [d, setD] = useState<Details | null>(null);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) throw new Error('Sign in to see payment details.');
                const res = await getOrderPaymentDetails(token, orderId);
                if (!cancelled) setD(res);
            } catch (e: any) {
                if (!cancelled) setErr(e?.message || 'Could not load payment details.');
            }
        })();
        return () => { cancelled = true; };
    }, [orderId]);

    if (err) return <p className="text-sm text-rose-600">{err}</p>;
    if (!d) return <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading payment details" />;
    if (d.status !== 'awaiting_payment') return null;

    const due = d.paymentDueAt ? new Date(d.paymentDueAt).toLocaleString('en-AU', { timeZone: 'Australia/Perth', dateStyle: 'medium', timeStyle: 'short' }) : null;
    const reportHref = `/contact?topic=order-problem&ref=${encodeURIComponent(d.paymentReference || d.id)}`;

    return (
        <section aria-label="Payment instructions" className="space-y-4 rounded-2xl border-2 border-primary bg-primary/5 p-5">
            {d.paymentMethod === 'payid' ? (
                <>
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                        <div>
                            <h3 className="text-lg font-black text-foreground">Pay {d.sellerName || 'the seller'} by PayID</h3>
                            <p className="text-sm text-foreground/80">
                                Transfer the exact amount from your banking app using the PayID and reference below.
                                {due ? ` Pay by ${due} (Perth time) or the items are released.` : ''}
                            </p>
                        </div>
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
                        <li>The seller marks the order as paid when the money arrives; you&apos;ll get a notification.</li>
                    </ol>
                </>
            ) : (
                <div className="flex items-start gap-3">
                    <MapPin className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                    <div className="space-y-2 text-sm text-foreground/80">
                        <h3 className="text-lg font-black text-foreground">Cash on pickup in Perth</h3>
                        <p>
                            Message {d.sellerName || 'the seller'} to arrange a pickup time and a safe, public place
                            {due ? ` before ${due} (Perth time)` : ' within 72 hours'}. Bring <b>${formatPrice(d.totalAmount)}</b> in cash,
                            inspect the item, then pay. Quote reference <b className="font-mono">{d.paymentReference}</b>.
                        </p>
                        <Button asChild variant="outline" className="min-h-11"><Link href="/messages">Message the seller</Link></Button>
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
