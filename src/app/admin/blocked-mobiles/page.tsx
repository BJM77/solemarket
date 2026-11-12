'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Ban, Loader2, ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { blockMobileAction, listBlockedMobilesAction, unblockMobileAction } from '@/app/actions/admin/blocked-mobiles';
import { MAX_BLOCK_REASON, MULTI_SELLER_BLOCK_THRESHOLD } from '@/lib/checkout/blocks';

type Sitewide = { id: string; mobile: string; e164: string | null; uids: string[]; reason: string | null; createdAtMs: number | null };
type Multi = { mobile: string; display: string; sellerCount: number; reasons: string[]; lastBlockedAtMs: number | null };

const fmtDate = (ms: number | null) => (ms ? new Date(ms).toLocaleDateString('en-AU', { timeZone: 'Australia/Perth' }) : '');

/**
 * Sitewide blocked mobiles. A blocked number (and any accounts seen with it) can't send
 * requests or offers on any listing, and its open requests are cancelled when it's added.
 * Also lists numbers blocked by several sellers so they can be promoted here.
 */
export default function BlockedMobilesPage() {
    const { toast } = useToast();
    const [data, setData] = useState<{ sitewide: Sitewide[]; multiSeller: Multi[]; sellerBlockCount: number } | null>(null);
    const [mobile, setMobile] = useState('');
    const [uid, setUid] = useState('');
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();

    const load = useCallback(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const r = await listBlockedMobilesAction(idToken);
        if (r.success) setData({ sitewide: r.sitewide, multiSeller: r.multiSeller, sellerBlockCount: r.sellerBlockCount });
        else toast({ title: 'Could not load blocks', description: r.error, variant: 'destructive' });
    }, [toast]);

    useEffect(() => { load(); }, [load]);

    const block = (input: { mobile: string; uid?: string; reason?: string }) => startTransition(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const r = await blockMobileAction(idToken, input);
        if (r.success) {
            toast({ title: 'Blocked sitewide', description: r.cancelled ? `${r.cancelled} open request${r.cancelled === 1 ? '' : 's'} cancelled.` : 'No open requests to cancel.' });
            setMobile(''); setUid(''); setReason('');
            await load();
        } else {
            toast({ title: 'Error', description: r.error, variant: 'destructive' });
        }
    });

    const unblock = (key: string) => {
        if (!confirm('Remove this sitewide block?')) return;
        startTransition(async () => {
            const idToken = await getCurrentUserIdToken();
            if (!idToken) return;
            const r = await unblockMobileAction(idToken, key);
            if (r.success) { toast({ title: 'Unblocked' }); await load(); }
            else toast({ title: 'Error', description: r.error, variant: 'destructive' });
        });
    };

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-black"><Ban className="h-6 w-6" /> Blocked mobiles</h1>
                <p className="text-sm text-muted-foreground">Blocked numbers see &quot;We can&apos;t accept requests from this number. Contact support.&quot; on every listing.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Block a number sitewide</CardTitle>
                    <CardDescription>Their open requests are cancelled and the sellers are notified. Accounts that used this number are blocked too.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form className="grid gap-3 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); block({ mobile, uid: uid || undefined, reason }); }} data-testid="admin-block-form">
                        <div className="space-y-1">
                            <Label htmlFor="block-mobile">Mobile</Label>
                            <Input id="block-mobile" type="tel" placeholder="0412 345 678" value={mobile} onChange={(e) => setMobile(e.target.value)} required />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="block-uid">Account id (optional)</Label>
                            <Input id="block-uid" placeholder="Firebase uid" value={uid} onChange={(e) => setUid(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="block-reason">Reason</Label>
                            <Input id="block-reason" maxLength={MAX_BLOCK_REASON} value={reason} onChange={(e) => setReason(e.target.value)} />
                        </div>
                        <Button type="submit" variant="destructive" className="md:col-span-3" disabled={pending || !mobile}>
                            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Block sitewide
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg"><ShieldAlert className="h-5 w-5" /> Blocked by {MULTI_SELLER_BLOCK_THRESHOLD}+ sellers</CardTitle>
                    <CardDescription>Numbers several sellers have blocked that aren&apos;t blocked sitewide yet{data ? ` (${data.sellerBlockCount} seller blocks in total)` : ''}.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {!data ? <Loader2 className="h-4 w-4 animate-spin" /> : data.multiSeller.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None right now.</p>
                    ) : data.multiSeller.map((m) => (
                        <div key={m.mobile} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm">
                            <div className="min-w-0">
                                <p className="font-mono font-semibold">{m.display} <span className="font-sans text-xs font-normal text-muted-foreground">· {m.sellerCount} sellers{m.lastBlockedAtMs ? ` · last ${fmtDate(m.lastBlockedAtMs)}` : ''}</span></p>
                                {m.reasons.length > 0 && <p className="truncate text-xs text-muted-foreground">{m.reasons.join(' · ')}</p>}
                            </div>
                            <Button size="sm" variant="destructive" disabled={pending} onClick={() => block({ mobile: m.mobile, reason: `Blocked by ${m.sellerCount} sellers` })}>Block sitewide</Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Sitewide blocks{data ? ` (${data.sitewide.length})` : ''}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {!data ? <Loader2 className="h-4 w-4 animate-spin" /> : data.sitewide.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No numbers are blocked sitewide.</p>
                    ) : data.sitewide.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm" data-testid="sitewide-block-row">
                            <div className="min-w-0">
                                <p className="font-mono font-semibold">{b.mobile} <span className="font-sans text-xs font-normal text-muted-foreground">{fmtDate(b.createdAtMs)}{b.uids.length ? ` · ${b.uids.length} account${b.uids.length === 1 ? '' : 's'}` : ''}</span></p>
                                {b.reason && <p className="truncate text-xs text-muted-foreground">{b.reason}</p>}
                            </div>
                            <Button size="sm" variant="outline" disabled={pending} onClick={() => unblock(b.e164 || b.id)}>Unblock</Button>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}
