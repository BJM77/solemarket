'use client';

import { useState, useTransition } from 'react';
import { Ban, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { blockBuyerAction } from '@/app/actions/marketplace/buyer-blocks';
import { MAX_BLOCK_REASON } from '@/lib/checkout/blocks';

/**
 * Seller: block the buyer on this order/request. Declines their open requests to you and stops
 * new ones from their mobile (and account). Unblock from "Blocked buyers" in the dashboard.
 */
export function BlockBuyerButton({ order }: { order: { id: string; buyerName?: string | null } }) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [reason, setReason] = useState('');
    const [pending, startTransition] = useTransition();

    const submit = () => startTransition(async () => {
        const idToken = await getCurrentUserIdToken();
        if (!idToken) return;
        const r = await blockBuyerAction(idToken, order.id, reason);
        if (r.success) {
            toast({ title: 'Buyer blocked', description: r.declined ? `${r.declined} open request${r.declined === 1 ? '' : 's'} from them ${r.declined === 1 ? 'was' : 'were'} declined.` : "They can't send you new requests." });
            setOpen(false);
            setReason('');
            window.dispatchEvent(new Event('benched:blocks-changed'));
        } else {
            toast({ title: 'Error', description: r.error, variant: 'destructive' });
        }
    });

    return (
        <>
            <Button variant="ghost" className="w-full min-h-11 gap-2 text-slate-500 hover:text-rose-600" onClick={() => setOpen(true)} data-testid="seller-block-buyer">
                <Ban className="h-4 w-4" /> Block this buyer
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="rounded-2xl sm:max-w-md" data-testid="block-buyer-dialog">
                    <DialogHeader>
                        <DialogTitle>Block {order.buyerName || 'this buyer'}?</DialogTitle>
                        <DialogDescription>
                            Their open requests to you are declined, and they can&apos;t send you new requests or offers from this mobile or account. They&apos;ll only see &quot;This seller isn&apos;t accepting requests from you.&quot; You can unblock them any time under Blocked buyers.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1">
                        <Label htmlFor={`block-reason-${order.id}`}>Reason (optional, only you and Benched admins see it)</Label>
                        <Input id={`block-reason-${order.id}`} maxLength={MAX_BLOCK_REASON} placeholder="e.g. didn't pay, didn't show up for pickup" value={reason} onChange={(e) => setReason(e.target.value)} />
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button variant="destructive" disabled={pending} onClick={submit} data-testid="block-buyer-confirm">
                            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Block buyer
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
