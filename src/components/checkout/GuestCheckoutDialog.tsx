'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Send, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils/format';
import { startGuestCheckoutAction, placeGuestRequestAction } from '@/app/actions/marketplace/guest-checkout';
import { validateGuestDetails, msUntilFormReady } from '@/lib/checkout/guest-validation';
import { saveGuestOrder } from '@/lib/checkout/guest-orders-local';

const DEVICE_KEY = 'benched:device-id';

/** Random per-browser id used only to cap holds per device (no tracking, never shown). */
export function getDeviceId(): string {
    try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id || !/^[\w-]{8,64}$/.test(id)) {
            id = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
            localStorage.setItem(DEVICE_KEY, id!);
        }
        return id!;
    } catch {
        return '';
    }
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: { id: string; title: string; price: number };
    signInHref: string;
    /** Seller has a PayID set up (guest checkout is PayID only). */
    payIdReady: boolean;
    /** 'buy' = request at the asking price; 'offer' = a lower amount. */
    mode?: 'buy' | 'offer';
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Guest request (no account, no email code): name, email and mobile -> a Buy or Offer request
 * goes to the seller, and the buyer follows it on their private order page. Nothing is held
 * until the seller accepts; then the page shows the PayID.
 */
export function GuestCheckoutDialog({ open, onOpenChange, product, signInHref, payIdReady, mode = 'buy' }: Props) {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [website, setWebsite] = useState(''); // honeypot
    const [offer, setOffer] = useState('');
    const isOffer = mode === 'offer';
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'shipping'>('pickup');
    const [addr, setAddr] = useState({ street: '', city: '', state: 'WA', zip: '' });
    const [ticket, setTicket] = useState<{ ticketId: string; issuedAtMs: number; localAtMs: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    // A fresh one-use form ticket each time the dialog opens (records when the form was shown).
    useEffect(() => {
        if (!open) { setError(null); setTicket(null); return; }
        if (!payIdReady) return;
        let cancelled = false;
        startGuestCheckoutAction(product.id).then((r) => {
            if (cancelled) return;
            if (r.success) setTicket({ ticketId: r.ticketId, issuedAtMs: r.issuedAtMs, localAtMs: Date.now() });
            else setError(r.error);
        }).catch(() => { if (!cancelled) setError('Something went wrong. Please try again.'); });
        return () => { cancelled = true; };
    }, [open, payIdReady, product.id]);

    const sendRequest = () => {
        setError(null);
        const offerAmount = isOffer ? Math.round(Number(offer) * 100) / 100 : null;
        if (isOffer && (!Number.isFinite(offerAmount!) || offerAmount! < 1 || offerAmount! >= product.price)) {
            setError(`Enter an offer below the asking price of $${formatPrice(product.price)}.`);
            return;
        }
        try {
            validateGuestDetails({ name, email, mobile, shippingMethod, shippingAddress: addr });
        } catch (e: any) {
            setError(e.message);
            return;
        }
        if (!ticket) { setError('Still getting checkout ready. Try again in a moment.'); return; }
        startTransition(async () => {
            // Very fast fills (autofill) wait out the minimum form time instead of erroring.
            await sleep(msUntilFormReady(ticket.localAtMs, Date.now()));
            const res = await placeGuestRequestAction({
                productId: product.id, ticketId: ticket.ticketId, name, email, mobile, shippingMethod,
                shippingAddress: shippingMethod === 'shipping' ? addr : null,
                deviceId: getDeviceId(),
                website,
                requestType: isOffer ? 'offer' : 'buy',
                offerAmount,
            });
            if (!res.success) {
                setError(res.error);
                // A used or expired ticket needs a new one.
                if (/expired|already used/i.test(res.error)) {
                    const t = await startGuestCheckoutAction(product.id);
                    if (t.success) setTicket({ ticketId: t.ticketId, issuedAtMs: t.issuedAtMs, localAtMs: Date.now() });
                }
                return;
            }
            saveGuestOrder({
                token: res.orderToken,
                title: res.title || product.title,
                reference: res.paymentReference,
                totalAmount: res.totalAmount,
                createdAtMs: Date.now(),
                holdExpiresAtMs: null,
                status: 'requested',
                requestStatus: 'pending',
            });
            onOpenChange(false);
            router.push(`/order/${res.orderToken}`);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-md" data-testid="guest-checkout-dialog">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">{isOffer ? 'Make an offer' : 'Request to buy'}</DialogTitle>
                    <DialogDescription>
                        {product.title} · ${formatPrice(product.price)}
                    </DialogDescription>
                </DialogHeader>

                {!payIdReady ? (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground/80">
                            This seller only takes cash at a Perth pickup, so you&apos;ll need to sign in to arrange it with them.
                        </p>
                        <Button asChild className="w-full min-h-11 font-bold"><Link href={signInHref}>Sign in to continue</Link></Button>
                    </div>
                ) : (
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); sendRequest(); }}>
                        {isOffer && (
                            <div className="space-y-1">
                                <Label htmlFor="guest-offer">Your offer (AUD)</Label>
                                <Input id="guest-offer" type="number" inputMode="decimal" min={1} step="0.01" placeholder={`Below $${formatPrice(product.price)}`} value={offer} onChange={(e) => setOffer(e.target.value)} required />
                            </div>
                        )}
                        <div className="space-y-1">
                            <Label htmlFor="guest-name">Name</Label>
                            <Input id="guest-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="guest-email">Email</Label>
                            <Input id="guest-email" type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="guest-mobile">Mobile</Label>
                            <Input id="guest-mobile" type="tel" autoComplete="tel" inputMode="tel" placeholder="04xx xxx xxx" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                            <p className="text-[11px] text-muted-foreground">Your email and mobile go to the seller only, so they can contact you about this order. We don&apos;t send you emails.</p>
                        </div>
                        {/* Honeypot: hidden from people and screen readers; bots fill it in. */}
                        <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
                            <label htmlFor="guest-website">Website</label>
                            <input id="guest-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                        <fieldset className="space-y-2">
                            <legend className="text-sm font-medium">Delivery</legend>
                            <div className="grid grid-cols-2 gap-2">
                                {(['pickup', 'shipping'] as const).map((m) => (
                                    <Button key={m} type="button" variant={shippingMethod === m ? 'default' : 'outline'} className="min-h-11" onClick={() => setShippingMethod(m)} aria-pressed={shippingMethod === m}>
                                        {m === 'pickup' ? 'Pickup (Perth)' : 'Post it to me'}
                                    </Button>
                                ))}
                            </div>
                        </fieldset>
                        {shippingMethod === 'shipping' && (
                            <div className="grid grid-cols-2 gap-2">
                                <Input className="col-span-2" placeholder="Street address" autoComplete="street-address" value={addr.street} onChange={(e) => setAddr({ ...addr, street: e.target.value })} aria-label="Street address" />
                                <Input placeholder="Suburb" autoComplete="address-level2" value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} aria-label="Suburb" />
                                <Input placeholder="State" autoComplete="address-level1" value={addr.state} onChange={(e) => setAddr({ ...addr, state: e.target.value })} aria-label="State" />
                                <Input placeholder="Postcode" inputMode="numeric" autoComplete="postal-code" value={addr.zip} onChange={(e) => setAddr({ ...addr, zip: e.target.value })} aria-label="Postcode" />
                            </div>
                        )}
                        <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-foreground/80">
                            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                            <p>
                                The seller approves every sale. They&apos;ll accept{isOffer ? ', decline or counter your offer' : ' or decline'}, usually within 24 hours.
                                Nothing is reserved until they accept, and you pay by PayID only after that. Next you&apos;ll get a private order page: save or bookmark it, as it&apos;s your only link to this request.
                                You can have up to 3 items requested or reserved at once.
                            </p>
                        </div>
                        {error && <p className="text-sm font-medium text-rose-600" role="alert">{error}</p>}
                        <Button type="submit" className="w-full min-h-11 font-bold" disabled={pending || !ticket} data-testid="guest-send-request">
                            {pending || (!ticket && !error) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {isOffer ? 'Send offer' : 'Send request to buy'}
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            Have an account? <Link href={signInHref} className="font-bold underline">Sign in</Link>
                        </p>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
