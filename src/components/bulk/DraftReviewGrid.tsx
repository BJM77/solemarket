'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getDraftListing, publishListing, saveDraftListing } from '@/app/actions/seller/sell';
import { loadDraftIds, removeDraftIds } from '@/lib/bulk/draft-store';
import { CONDITIONS } from '@/lib/listing-wizard/steps';

const CARD_CONDITIONS = CONDITIONS['Collector Cards'];

interface Row { id: string; title: string; price: number; condition: string; image?: string; status: string; dirty?: boolean; error?: string; busy?: boolean }

/** Review grid for Fast Bulk / Autofast drafts: inline edit, batch defaults, publish selected. */
export default function DraftReviewGrid({ ids: extraIds = [] }: { ids?: string[] }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPrice, setBatchPrice] = useState('');
  const [batchCondition, setBatchCondition] = useState('');
  const [publishing, setPublishing] = useState(false);
  const idKey = extraIds.join(',');

  const load = useCallback(async () => {
    setLoading(true);
    const ids = Array.from(new Set([...loadDraftIds(), ...idKey.split(',').filter(Boolean)]));
    const token = (await getCurrentUserIdToken()) ?? '';
    if (!token) { setRows([]); setLoading(false); return; }
    const gone: string[] = [];
    const loaded = await Promise.all(ids.map(async (id): Promise<Row | null> => {
      try {
        const d = await getDraftListing(id, token);
        if (!d || !d.isDraft) { gone.push(id); return null; }
        return { id, title: d.title || '', price: Number(d.price) || 0, condition: d.condition || '', image: d.imageUrls?.[0], status: d.status };
      } catch (e: any) { if (/not found/i.test(e?.message || '')) gone.push(id); return null; }
    }));
    if (gone.length) removeDraftIds(gone);
    setRows(loaded.filter((r): r is Row => !!r).reverse());
    setLoading(false);
  }, [idKey, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (!isUserLoading) void load(); }, [load, isUserLoading]);

  const patch = (id: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = rows.length > 0 && selected.size === rows.length;

  const applyBatch = () => {
    const price = parseFloat(batchPrice);
    const target = selected.size ? selected : new Set(rows.map((r) => r.id));
    setRows((rs) => rs.map((r) => target.has(r.id) ? {
      ...r, dirty: true,
      ...(price > 0 ? { price } : {}),
      ...(batchCondition ? { condition: batchCondition } : {}),
    } : r));
  };

  const saveRow = async (r: Row, token: string) => {
    await saveDraftListing(token, { title: r.title.slice(0, 120), price: r.price, condition: r.condition, category: 'Collector Cards' } as any, r.id);
    patch(r.id, { dirty: false });
  };

  const saveAll = async () => {
    const token = (await getCurrentUserIdToken()) ?? '';
    const dirty = rows.filter((r) => r.dirty);
    await Promise.all(dirty.map((r) => saveRow(r, token).catch((e) => patch(r.id, { error: e?.message }))));
    toast({ title: `Saved ${dirty.length} draft${dirty.length === 1 ? '' : 's'}` });
  };

  const publishSelected = async () => {
    setPublishing(true);
    const token = (await getCurrentUserIdToken()) ?? '';
    const chosen = rows.filter((r) => selected.has(r.id));
    const ok: string[] = [];
    // Sequential: publish checks the seller's listing limit.
    for (const r of chosen) {
      patch(r.id, { busy: true, error: undefined });
      try {
        if (r.dirty) await saveRow(r, token);
        await publishListing(r.id, token);
        ok.push(r.id);
      } catch (e: any) {
        patch(r.id, { error: e?.message || 'Publish failed' });
      } finally { patch(r.id, { busy: false }); }
    }
    removeDraftIds(ok);
    setRows((rs) => rs.filter((r) => !ok.includes(r.id)));
    setSelected(new Set());
    setPublishing(false);
    toast({ title: `Published ${ok.length} of ${chosen.length}`, description: ok.length < chosen.length ? 'Some need fixing, see the red notes.' : undefined });
  };

  if (!isUserLoading && !user) return <p className="text-sm"><Link href="/sign-in?redirect=/sell/drafts-review" className="text-primary underline">Sign in</Link> to review your drafts.</p>;
  if (loading) return <p className="text-sm text-muted-foreground">Loading drafts…</p>;
  if (!rows.length) return <p className="text-sm text-muted-foreground">No Fast Bulk or Autofast drafts on this device yet.</p>;

  return (
    <div className="space-y-4" data-testid="draft-review-grid">
      <div className="rounded-xl border border-border bg-white p-3 flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium">Price (AUD)
          <Input className="w-28 h-9" inputMode="decimal" value={batchPrice} onChange={(e) => setBatchPrice(e.target.value)} placeholder="e.g. 5" />
        </label>
        <label className="text-xs font-medium">Condition
          <select className="block h-9 rounded-md border border-input bg-white px-2 text-sm" value={batchCondition} onChange={(e) => setBatchCondition(e.target.value)}>
            <option value="">—</option>
            {CARD_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <Button variant="outline" size="sm" onClick={applyBatch}>Apply to {selected.size ? 'selected' : 'all'}</Button>
        <span className="text-xs text-muted-foreground">Category: Collector Cards</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}>{allSelected ? 'Clear selection' : 'Select all'}</Button>
        <Button variant="outline" size="sm" onClick={saveAll} disabled={!rows.some((r) => r.dirty)}>Save changes</Button>
        <Button size="sm" className="text-slate-900 font-semibold" onClick={publishSelected} disabled={!selected.size || publishing}>
          {publishing ? 'Publishing…' : `Publish selected (${selected.size})`}
        </Button>
        <span className="text-xs text-muted-foreground">{rows.length} draft{rows.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className={`rounded-xl border bg-white p-2 flex gap-2 ${selected.has(r.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
            <div className="flex flex-col items-center gap-1">
              <input type="checkbox" aria-label="Select" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[#f26c0d]" />
              {r.image
                ? <img src={r.image} alt="" className="h-24 w-[68px] rounded object-cover bg-muted" loading="lazy" />
                : <div className="h-24 w-[68px] rounded bg-muted" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <Input className="h-8 text-sm" value={r.title} onChange={(e) => patch(r.id, { title: e.target.value, dirty: true })} aria-label="Title" />
              <div className="flex gap-1">
                <Input className="h-8 w-20 text-sm" inputMode="decimal" value={r.price || ''} placeholder="$" onChange={(e) => patch(r.id, { price: parseFloat(e.target.value) || 0, dirty: true })} aria-label="Price" />
                <select className="h-8 flex-1 min-w-0 rounded-md border border-input bg-white px-1 text-sm" value={r.condition} onChange={(e) => patch(r.id, { condition: e.target.value, dirty: true })} aria-label="Condition">
                  {!CARD_CONDITIONS.includes(r.condition) && r.condition && <option value={r.condition}>{r.condition}</option>}
                  {CARD_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Link href={`/sell/create?edit=${r.id}`} className="text-primary underline">Full edit</Link>
                {r.dirty && <span className="text-muted-foreground">unsaved</span>}
                {r.busy && <span className="text-muted-foreground">working…</span>}
              </div>
              {r.error && <p className="text-xs text-red-600">{r.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
