'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Flag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import {
  listTakedownRequestsAction,
  rejectTakedownRequestAction,
  removeListingForTakedownAction,
  blockSellerMobileForTakedownAction,
  type TakedownRequestRow,
} from '@/app/actions/admin/takedowns';

const fmt = (ms: number | null) =>
  ms ? new Date(ms).toLocaleString('en-AU', { timeZone: 'Australia/Perth' }) : '';

export default function AdminTakedownsPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<TakedownRequestRow[]>([]);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const idToken = await getCurrentUserIdToken();
    if (!idToken) return;
    const r = await listTakedownRequestsAction(idToken);
    if (r.success) setRows(r.requests);
    else toast({ title: 'Could not load reports', description: r.error, variant: 'destructive' });
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const run = (fn: () => Promise<{ success: true } | { success: false; error: string }>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.success) { toast({ title: ok }); await load(); }
      else toast({ title: 'Error', description: r.error, variant: 'destructive' });
    });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black"><Flag className="h-6 w-6" /> Infringement reports</h1>
        <p className="text-sm text-muted-foreground">Reports from /report-infringement. Removing a listing hides it (status: deleted). Blocking uses the seller&apos;s mobile on file.</p>
      </div>

      {rows.length === 0 ? (
        <Card><CardContent className="py-10 text-sm text-muted-foreground">No reports yet.</CardContent></Card>
      ) : rows.map((r) => (
        <Card key={r.id} data-testid={`takedown-${r.id}`}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">{r.name}{r.organisation ? ` · ${r.organisation}` : ''}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{r.email} · {fmt(r.createdAtMs)}</p>
            </div>
            <Badge variant={r.status === 'new' ? 'default' : r.status === 'actioned' ? 'secondary' : 'outline'}>{r.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p><span className="font-semibold uppercase tracking-wide text-xs text-muted-foreground">{r.type}</span></p>
            <p className="whitespace-pre-wrap">{r.description}</p>
            <ul className="space-y-1">
              {r.listingUrls.map((u) => (
                <li key={u}><a href={u} className="underline break-all" target="_blank" rel="noreferrer">{u}</a></li>
              ))}
              {r.listingIds.map((id) => (
                <li key={id}><Link href={`/product/${id}`} className="underline">Listing {id}</Link></li>
              ))}
            </ul>
            {r.actionNote && <p className="text-xs text-muted-foreground">Last action: {r.actionNote}</p>}
            <div className="flex flex-wrap gap-2 pt-2">
              {r.listingIds[0] && (
                <Button size="sm" variant="destructive" disabled={pending} onClick={() => {
                  if (!confirm('Remove this listing? It will be hidden (deleted status).')) return;
                  const idTokenP = getCurrentUserIdToken();
                  run(async () => {
                    const idToken = await idTokenP;
                    if (!idToken) return { success: false, error: 'Sign in again.' };
                    return removeListingForTakedownAction(idToken, r.id, r.listingIds[0]);
                  }, 'Listing removed');
                }}>Remove listing</Button>
              )}
              <Button size="sm" variant="outline" disabled={pending} onClick={() => {
                if (!confirm("Block this seller's mobile sitewide?")) return;
                run(async () => {
                  const idToken = await getCurrentUserIdToken();
                  if (!idToken) return { success: false, error: 'Sign in again.' };
                  return blockSellerMobileForTakedownAction(idToken, r.id, r.listingIds[0]);
                }, 'Seller mobile blocked');
              }}>Block seller mobile</Button>
              {r.status !== 'rejected' && (
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => {
                  run(async () => {
                    const idToken = await getCurrentUserIdToken();
                    if (!idToken) return { success: false, error: 'Sign in again.' };
                    return rejectTakedownRequestAction(idToken, r.id);
                  }, 'Marked rejected');
                }}>Mark rejected</Button>
              )}
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
