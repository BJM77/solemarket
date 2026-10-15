'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getMyPayoutDetails, savePayoutDetails } from '@/app/actions/marketplace/order-payments';

/**
 * Seller PayID (stored privately; only shown to the buyer of a placed order).
 * Without it, buyers can only pay this seller in cash at a Perth pickup.
 */
export function PayIdSettings({ compact = false }: { compact?: boolean }) {
    const { toast } = useToast();
    const [payId, setPayId] = useState('');
    const [accountName, setAccountName] = useState('');
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const token = await getCurrentUserIdToken();
                if (!token) return;
                const d = await getMyPayoutDetails(token);
                if (d) { setPayId(d.payId); setAccountName(d.accountName); setSaved(true); }
            } catch { /* not signed in */ } finally { setLoading(false); }
        })();
    }, []);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error('Please sign in again.');
            const res = await savePayoutDetails(token, { payId, accountName });
            if (!res.success) throw new Error(res.error);
            setSaved(true);
            toast({ title: 'PayID saved', description: 'Buyers can now pay you by PayID.' });
        } catch (err: any) {
            toast({ title: 'Could not save PayID', description: err?.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={save} className="space-y-4 rounded-2xl border p-5" aria-labelledby="payid-heading" data-testid="payid-settings">
            <div>
                <h2 id="payid-heading" className="flex items-center gap-2 text-lg font-black">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" aria-hidden /> Get paid by PayID
                </h2>
                {!compact && (
                    <p className="text-sm text-muted-foreground">
                        Buyers transfer straight to your bank. Your PayID is private: it&apos;s only shown to a buyer after they place an order with you.
                        Until you add one, buyers can only pay you in cash at a Perth pickup.
                    </p>
                )}
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Loading" /> : (
                <>
                    <div className="space-y-2">
                        <Label htmlFor="payid-value">PayID (email, mobile or ABN)</Label>
                        <Input id="payid-value" value={payId} autoComplete="off" placeholder="you@example.com or 0412 345 678" onChange={e => setPayId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="payid-name">Account name (as your bank shows it)</Label>
                        <Input id="payid-name" value={accountName} autoComplete="name" onChange={e => setAccountName(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Button type="submit" className="min-h-11" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {saved ? 'Update PayID' : 'Save PayID'}
                        </Button>
                        {saved && <span className="text-sm font-semibold text-emerald-600">PayID payments on</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">When a buyer pays, check the money has arrived in your account, then press &quot;Mark as paid&quot; on the order.</p>
                </>
            )}
        </form>
    );
}
