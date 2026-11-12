'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { listMyBlockedBuyersAction, unblockBuyerAction } from '@/app/actions/marketplace/buyer-blocks';

type Block = { id: string; mobile: string | null; hasAccount: boolean; buyerName: string | null; reason: string | null; createdAtMs: number | null };

/** Seller dashboard: buyers you've blocked, with Unblock. Read through a server action only. */
export function BlockedBuyers() {
    const { toast } = useToast();
    const [blocks, setBlocks] = useState<Block[] | null>(null);
    const [pending, startTransition] = useTransition();

    const load = useCallback(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const r = await listMyBlockedBuyersAction(idToken);
        setBlocks(r.success ? r.blocks : []);
    }, []);

    useEffect(() => {
        load();
        const onChange = () => { load(); };
        window.addEventListener('benched:blocks-changed', onChange);
        return () => window.removeEventListener('benched:blocks-changed', onChange);
    }, [load]);

    const unblock = (id: string) => startTransition(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const r = await unblockBuyerAction(idToken, id);
        if (r.success) { toast({ title: 'Buyer unblocked' }); await load(); }
        else toast({ title: 'Error', description: r.error, variant: 'destructive' });
    });

    return (
        <details className="rounded-2xl border border-border bg-background/60 p-4" data-testid="blocked-buyers">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <Ban className="h-4 w-4" /> Blocked buyers{blocks ? ` (${blocks.length})` : ''}
            </summary>
            <div className="mt-3 space-y-2">
                {blocks === null ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : blocks.length === 0 ? (
                    <p className="text-xs text-muted-foreground">You haven&apos;t blocked anyone. Use &quot;Block this buyer&quot; on a request if someone doesn&apos;t follow through.</p>
                ) : blocks.map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm" data-testid="blocked-buyer-row">
                        <div className="min-w-0">
                            <p className="font-semibold">{b.buyerName || 'Buyer'} {b.mobile && <span className="font-mono text-xs text-muted-foreground">{b.mobile}</span>}</p>
                            <p className="truncate text-xs text-muted-foreground">
                                {b.createdAtMs ? `Blocked ${new Date(b.createdAtMs).toLocaleDateString('en-AU')}` : 'Blocked'}{b.reason ? ` · ${b.reason}` : ''}
                            </p>
                        </div>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => unblock(b.id)} data-testid="unblock-buyer">Unblock</Button>
                    </div>
                ))}
            </div>
        </details>
    );
}
