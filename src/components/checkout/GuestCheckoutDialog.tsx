'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatPrice } from '@/lib/utils/format';
import { requestGuestCodeAction, confirmGuestCodeAction } from '@/app/actions/marketplace/guest-checkout';
import { validateGuestDetails } from '@/lib/checkout/guest-validation';

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
}

/**
 * Guest checkout (no account): name, email and mobile -> 6-digit code by email -> the item is
 * held for 30 minutes and the buyer is sent to their private order page with the PayID.
 */
export function GuestCheckoutDialog({ open, onOpenChange, product, signInHref, payIdReady }: Props) {
    const router = useRouter();
    const [step, setStep] = useState<'details' | 'code'>('details');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [mobile, setMobile] = useState('');
    const [shippingMethod, setShippingMethod] = useState<'pickup' | 'shipping'>('pickup');
    const [addr, setAddr] = useState({ street: '', city: '', state: 'WA', zip: '' });
    const [code, setCode] = useState('');
    const [challenge, setChallenge] = useState<{ challengeId: string; email: string; totalAmount: number; shippingCost: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pending, startTransition] = useTransition();

    useEffect(() => { if (!open) { setError(null); } }, [open]);

    const sendCode = () => {
        setError(null);
        try {
            validateGuestDetails({ name, email, mobile, shippingMethod, shippingAddress: addr });
        } catch (e: any) {
            setError(e.message);
            return;
        }
        startTransition(async () => {
            const res = await requestGuestCodeAction({
                productId: product.id, name, email, mobile, shippingMethod,
                shippingAddress: shippingMethod === 'shipping' ? addr : null,
                deviceId: getDeviceId(),
            });
            if (!res.success) { setError(res.error); return; }
            setChallenge(res);
            setCode('');
            setStep('code');
        });
    };

    const confirm = () => {
        if (!challenge) return;
        setError(null);
        if (!/^\d{6}$/.test(code.trim())) { setError('Enter the 6-digit code from your email.'); return; }
        startTransition(async () => {
            const res = await confirmGuestCodeAction({ challengeId: challenge.challengeId, code: code.trim(), deviceId: getDeviceId() });
            if (!res.success) { setError(res.error); return; }
            onOpenChange(false);
            router.push(`/order/${res.orderToken}`);
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-md" data-testid="guest-checkout-dialog">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">Buy without an account</DialogTitle>
                    <DialogDescription>
                        {product.title} · ${formatPrice(product.price)}
                    </DialogDescription>
                </DialogHeader>

                {!payIdReady ? (
                    <div className="space-y-4">
                        <p className="text-sm text-foreground/80">
                            This seller only takes cash at a Perth pickup, so you&apos;ll need to sign in to arrange it with them.
                        </p>
                        <Button asChild className="w-full min-h-11 font-bold"><Link href={signInHref}>Sign in to buy</Link></Button>
                    </div>
                ) : step === 'details' ? (
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); sendCode(); }}>
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
                            <p className="text-[11px] text-muted-foreground">Shared with the seller so they can contact you about this order.</p>
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
                            <p>We&apos;ll email you a 6-digit code. Once you enter it, the item is held for you for <b>30 minutes</b> while you pay the seller by PayID.</p>
                        </div>
                        {error && <p className="text-sm font-medium text-rose-600" role="alert">{error}</p>}
                        <Button type="submit" className="w-full min-h-11 font-bold" disabled={pending} data-testid="guest-send-code">
                            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Email me a code
                        </Button>
                        <p className="text-center text-xs text-muted-foreground">
                            Have an account? <Link href={signInHref} className="font-bold underline">Sign in</Link>
                        </p>
                    </form>
                ) : (
                    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); confirm(); }}>
                        <p className="text-sm text-foreground/80">
                            We sent a 6-digit code to <b>{challenge?.email}</b>. It expires in 10 minutes. Check your spam folder if it isn&apos;t there.
                        </p>
                        {challenge && (
                            <p className="text-sm">
                                Total to pay: <b>${formatPrice(challenge.totalAmount)}</b>
                                {challenge.shippingCost > 0 ? ` (includes $${formatPrice(challenge.shippingCost)} postage)` : ''}
                            </p>
                        )}
                        <div className="space-y-1">
                            <Label htmlFor="guest-code">Code</Label>
                            <Input
                                id="guest-code"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                className="text-center font-mono text-2xl tracking-[0.5em]"
                                value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-sm font-medium text-rose-600" role="alert">{error}</p>}
                        <Button type="submit" className="w-full min-h-11 font-bold" disabled={pending || code.length !== 6} data-testid="guest-confirm-code">
                            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirm and hold for 30 minutes
                        </Button>
                        <div className="flex justify-between text-xs">
                            <button type="button" className="underline" onClick={() => { setStep('details'); setError(null); }}>Change details</button>
                            <button type="button" className="underline" disabled={pending} onClick={sendCode}>Send a new code</button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
