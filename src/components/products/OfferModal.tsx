'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product, SafeUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send, ShieldCheck } from 'lucide-react';
import { sendRequestAction } from '@/app/actions/marketplace/requests';
import { getIdTokenLazy as getCurrentUserIdToken } from '@/lib/firebase/lazy';
import { trackEcommerceEvent } from '@/lib/analytics';
import { formatPrice } from '@/lib/utils/format';
import { GuestCheckoutDialog } from '@/components/checkout/GuestCheckoutDialog';
import { BuyerMobileField, useBuyerMobile } from '@/components/checkout/BuyerMobileField';

interface OfferModalProps {
    product: Product;
    user: SafeUser | null;
    trigger?: React.ReactNode;
    /** Seller has a PayID (guests can only pay by PayID). Unknown -> assume yes; the server checks. */
    payIdReady?: boolean;
}

/**
 * Make an offer = send the seller an Offer request (src/lib/checkout/requests.ts). The seller
 * accepts, declines, or counters once; nothing is reserved until an offer is accepted.
 * Signed-out buyers use the guest request form (no account, no email).
 * Older offers stored on listings (product.bids) are still shown to sellers on the listing.
 */
export function OfferModal({ product, user, trigger, payIdReady = true }: OfferModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState('');
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'shipping'>('pickup');
    const [paymentMethod, setPaymentMethod] = useState<'payid' | 'cash'>(payIdReady ? 'payid' : 'cash');
    const [perthOk, setPerthOk] = useState(false);
    const [addr, setAddr] = useState({ street: '', city: '', state: 'WA', zip: '' });
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();
    const router = useRouter();
    const { toast } = useToast();
    const [mobile, setMobile] = useState('');
    const buyerMobile = useBuyerMobile(!!user && isOpen);

    const triggerEl = trigger || <Button variant="outline">Make an Offer</Button>;

    if (!user) {
        return (
            <>
                <span onClick={() => setIsOpen(true)} className="contents">{triggerEl}</span>
                <GuestCheckoutDialog
                    open={isOpen}
                    onOpenChange={setIsOpen}
                    product={{ id: product.id, title: product.title, price: Number(product.price || 0) }}
                    signInHref={`/sign-in?redirect=${encodeURIComponent(`/product/${product.id}`)}`}
                    payIdReady={payIdReady}
                    mode="offer"
                />
            </>
        );
    }

    const submit = () => {
        setError(null);
        const value = Math.round(Number(amount) * 100) / 100;
        if (!Number.isFinite(value) || value < 1 || value >= Number(product.price || 0)) {
            setError(`Enter an offer below the asking price of $${formatPrice(Number(product.price || 0))}.`);
            return;
        }
        if (paymentMethod === 'cash' && (shippingMethod !== 'pickup' || !perthOk)) {
            setError('Cash is for Perth pickups only. Tick the pickup box, or choose PayID.');
            return;
        }
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) { setError('Please sign in again.'); return; }
            const res = await sendRequestAction(idToken, {
                productId: product.id,
                requestType: 'offer',
                offerAmount: value,
                paymentMethod,
                shippingMethod,
                shippingAddress: shippingMethod === 'shipping' ? addr : null,
                perthPickupConfirmed: perthOk,
                mobile: buyerMobile.needsMobile ? mobile : undefined,
            });
            if (!res.success) {
                setError(res.error);
                if ((res as any).needsMobile) buyerMobile.askForMobile();
                return;
            }
            try { trackEcommerceEvent.generateLead(product, 'offer'); } catch { /* ignore */ }
            toast({ title: 'Offer sent', description: 'The seller will accept, decline or counter. Track it in your purchases.' });
            setIsOpen(false);
            router.push('/profile/orders');
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{triggerEl}</DialogTrigger>
            <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-md" data-testid="offer-dialog">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">Make an offer</DialogTitle>
                    <DialogDescription>{product.title} · asking ${formatPrice(Number(product.price || 0))}</DialogDescription>
                </DialogHeader>
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                    <div className="space-y-1">
                        <Label htmlFor="offer-amount">Your offer (AUD)</Label>
                        <Input id="offer-amount" type="number" inputMode="decimal" min={1} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                    </div>
                    {buyerMobile.needsMobile && <BuyerMobileField id="offer-mobile" value={mobile} onChange={setMobile} />}
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Delivery</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {(['pickup', 'shipping'] as const).map((m) => (
                                <Button key={m} type="button" variant={shippingMethod === m ? 'default' : 'outline'} className="min-h-11" aria-pressed={shippingMethod === m}
                                    onClick={() => { setShippingMethod(m); if (m === 'shipping' && paymentMethod === 'cash' && payIdReady) setPaymentMethod('payid'); }}>
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
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Payment (once accepted)</legend>
                        <div className="grid grid-cols-2 gap-2">
                            <Button type="button" variant={paymentMethod === 'payid' ? 'default' : 'outline'} className="min-h-11" disabled={!payIdReady} aria-pressed={paymentMethod === 'payid'} onClick={() => setPaymentMethod('payid')}>PayID</Button>
                            <Button type="button" variant={paymentMethod === 'cash' ? 'default' : 'outline'} className="min-h-11" disabled={shippingMethod !== 'pickup'} aria-pressed={paymentMethod === 'cash'} onClick={() => setPaymentMethod('cash')}>Cash on pickup</Button>
                        </div>
                        {paymentMethod === 'cash' && (
                            <label className="flex items-start gap-2 text-xs">
                                <input type="checkbox" className="mt-0.5" checked={perthOk} onChange={(e) => setPerthOk(e.target.checked)} />
                                I can collect in person in Perth and pay cash.
                            </label>
                        )}
                    </fieldset>
                    <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-foreground/80">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <p>The seller can accept, decline or send one counter-offer, usually within 24 hours. Nothing is reserved or paid until they accept. You can have up to 3 items requested or reserved at once.</p>
                    </div>
                    {error && <p className="text-sm font-medium text-rose-600" role="alert">{error}</p>}
                    <Button type="submit" className="w-full min-h-11 font-bold" disabled={pending} data-testid="offer-send">
                        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send offer
                    </Button>
                    <p className="text-center text-xs text-muted-foreground"><Link href="/profile/orders" className="underline">Your purchases and offers</Link></p>
                </form>
            </DialogContent>
        </Dialog>
    );
}
