'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getMyBuyerMobileAction } from '@/app/actions/marketplace/buyer-blocks';
import { getIdTokenLazy } from '@/lib/firebase/lazy';

/**
 * Signed-in buyers: whether their profile already has an Australian mobile. When it doesn't,
 * request forms show a mobile field; the server saves it to the profile on the first request.
 * `forceAsk` lets a form show the field after the server replies `needsMobile`.
 */
export function useBuyerMobile(enabled: boolean) {
    const [status, setStatus] = useState<{ loading: boolean; hasMobile: boolean; masked: string | null }>({ loading: enabled, hasMobile: false, masked: null });
    const [forceAsk, setForceAsk] = useState(false);
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        (async () => {
            try {
                const idToken = await getIdTokenLazy();
                if (!idToken) return;
                const r = await getMyBuyerMobileAction(idToken);
                if (!cancelled && r.success) setStatus({ loading: false, hasMobile: r.hasMobile, masked: r.masked });
            } catch { /* the server still checks */ } finally {
                if (!cancelled) setStatus((s) => ({ ...s, loading: false }));
            }
        })();
        return () => { cancelled = true; };
    }, [enabled]);
    return { ...status, needsMobile: enabled && !status.loading && (!status.hasMobile || forceAsk), askForMobile: () => setForceAsk(true) };
}

export function BuyerMobileField({ id = 'buyer-mobile', value, onChange, className }: { id?: string; value: string; onChange: (v: string) => void; className?: string }) {
    return (
        <div className={className ?? 'space-y-1'} data-testid="buyer-mobile-field">
            <Label htmlFor={id}>Your mobile</Label>
            <Input id={id} type="tel" autoComplete="tel" inputMode="tel" placeholder="04xx xxx xxx" value={value} onChange={(e) => onChange(e.target.value)} required />
            <p className="text-[11px] text-muted-foreground">Saved to your profile and shared with the seller only, so they can call or text you about your requests.</p>
        </div>
    );
}
