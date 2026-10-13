'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RotateCcw } from 'lucide-react';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { listSiteConfigHistory, restoreSiteConfig, type SiteConfigHistoryEntry } from '@/app/actions/admin/site-config';
import type { SiteConfig } from '@/lib/types/site-config';
import { useToast } from '@/hooks/use-toast';

export function HistoryPanel({ refreshKey, onRestored }: { refreshKey: number; onRestored: (c: SiteConfig) => void }) {
  const [items, setItems] = useState<SiteConfigHistoryEntry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    const token = await getCurrentUserIdToken();
    if (!token) return;
    try { setItems(await listSiteConfigHistory(token)); } catch (e: any) { toast({ variant: 'destructive', title: 'Could not load history', description: e.message }); }
  }, [toast]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const restore = async (id: string) => {
    if (!window.confirm('Restore this version? It goes live immediately and replaces the current draft.')) return;
    setBusy(id);
    try {
      const token = await getCurrentUserIdToken();
      if (!token) throw new Error('Please sign in again');
      const res = await restoreSiteConfig(token, id);
      onRestored(res.config);
      toast({ title: 'Version restored', description: 'The site is now using the restored settings.' });
      await load();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Restore failed', description: e.message });
    } finally { setBusy(null); }
  };

  return (
    <Card className="bg-zinc-900 border-white/10 text-white">
      <CardHeader>
        <CardTitle>Published versions</CardTitle>
        <CardDescription>Every publish is saved here. Restoring makes that version live again (and is itself logged).</CardDescription>
      </CardHeader>
      <CardContent>
        {items === null ? <Loader2 className="h-5 w-5 animate-spin" /> : items.length === 0 ? (
          <p className="text-sm text-zinc-400">No published versions yet.</p>
        ) : (
          <ul className="divide-y divide-white/10">
            {items.map((h, i) => (
              <li key={h.id} className="flex items-center justify-between gap-4 py-3">
                <div className="text-sm">
                  <div className="font-bold">{new Date(h.publishedAt).toLocaleString('en-AU')}{i === 0 && <span className="ml-2 rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-300">Live</span>}</div>
                  <div className="text-zinc-400">{h.restoredFrom ? `Restored from ${h.restoredFrom.slice(0, 6)}` : h.note || 'Published'} · {h.publishedBy?.slice(0, 8)}</div>
                </div>
                {i > 0 && (
                  <Button size="sm" variant="outline" className="border-white/20" disabled={!!busy} onClick={() => restore(h.id)}>
                    {busy === h.id ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-1 h-4 w-4" />} Restore
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
