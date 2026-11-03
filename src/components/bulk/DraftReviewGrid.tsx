'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getDraftListing, publishBatchListingsAction, publishListing, saveDraftListing } from '@/app/actions/seller/sell';
import { priceCheckAction } from '@/app/actions/marketplace/price-check';
import { loadDraftIds, removeDraftIds } from '@/lib/bulk/draft-store';
import { CONDITIONS } from '@/lib/listing-wizard/steps';
import { TrendingUp, Loader2, Sparkles } from 'lucide-react';

const CARD_CONDITIONS = CONDITIONS['Collector Cards'];

interface Row {
  id: string;
  title: string;
  price: number;
  condition: string;
  image?: string;
  status: string;
  dirty?: boolean;
  error?: string;
  busy?: boolean;
  suggestedPrice?: number | null;
  compSampleSize?: number;
  checkingPrice?: boolean;
}

/** Review grid for Fast Bulk / Autofast drafts: inline edit, sold-comp price suggestions, batch defaults, background publish. */
export default function DraftReviewGrid({ ids: extraIds = [] }: { ids?: string[] }) {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPrice, setBatchPrice] = useState('');
  const [batchCondition, setBatchCondition] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [checkingAllPrices, setCheckingAllPrices] = useState(false);
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

  const suggestPriceForRow = async (r: Row): Promise<{ ok: boolean; rateLimited?: boolean }> => {
    if (!r.title || r.title.trim().length < 3) return { ok: true };
    patch(r.id, { checkingPrice: true });
    try {
      const token = (await getCurrentUserIdToken()) ?? '';
      const res = await priceCheckAction(token, { query: r.title, category: 'Collector Cards', condition: r.condition, productId: r.id });
      if (res.success && res.result.median != null) {
        patch(r.id, {
          suggestedPrice: res.result.median,
          compSampleSize: res.result.sampleSize,
          ...(r.price <= 0 ? { price: res.result.median, dirty: true } : {}),
        });
        return { ok: true };
      } else {
        const isRate = !res.success && /too many/i.test(res.error || '');
        patch(r.id, { suggestedPrice: null, compSampleSize: 0, ...(isRate ? { error: 'Rate limit reached' } : {}) });
        return { ok: !isRate, rateLimited: isRate };
      }
    } catch {
      patch(r.id, { suggestedPrice: null });
      return { ok: false };
    } finally {
      patch(r.id, { checkingPrice: false });
    }
  };

  const suggestAllPrices = async () => {
    setCheckingAllPrices(true);
    const targets = selected.size ? rows.filter((r) => selected.has(r.id)) : rows;
    let hitRateLimit = false;

    // Process with a small delay between calls so we don't burst the price check rate limit
    for (const r of targets) {
      if (hitRateLimit) break;
      const res = await suggestPriceForRow(r);
      if (res.rateLimited) {
        hitRateLimit = true;
        break;
      }
      // 150ms pacing between requests
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    setCheckingAllPrices(false);
    if (hitRateLimit) {
      toast({
        title: 'Price check rate limit reached',
        description: 'Checked as many comps as allowed. Try checking the remaining items in a few minutes.',
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Sold-price check complete', description: 'Suggested prices from recent comps have been loaded.' });
    }
  };

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

  const publishBatch = async (targetRows: Row[]) => {
    if (!targetRows.length) return;
    setPublishing(true);
    const token = (await getCurrentUserIdToken()) ?? '';
    // Save any unsaved edits first
    const dirtyTargets = targetRows.filter((r) => r.dirty);
    const saveFailed = new Set<string>();
    if (dirtyTargets.length) {
      await Promise.all(dirtyTargets.map((r) => saveRow(r, token).catch((e) => {
        saveFailed.add(r.id);
        patch(r.id, { error: `Save failed, not published: ${e?.message || 'unknown error'}` });
      })));
    }
    // Don't publish a row whose edits failed to save (it would go live with stale details).
    targetRows = targetRows.filter((r) => !saveFailed.has(r.id));
    if (!targetRows.length) { setPublishing(false); return; }
    targetRows.forEach((r) => patch(r.id, { busy: true, error: undefined }));

    // Chunk publishing into batches of 50 to prevent network/server timeouts
    const BATCH_SIZE = 50;
    const allPublished: string[] = [];
    const allErrors: Record<string, string> = {};

    const chunks: Row[][] = [];
    for (let i = 0; i < targetRows.length; i += BATCH_SIZE) {
      chunks.push(targetRows.slice(i, i + BATCH_SIZE));
    }

    toast({
      title: `Publishing ${targetRows.length} listing${targetRows.length === 1 ? '' : 's'}…`,
      description: chunks.length > 1
        ? `Processing ${chunks.length} batches of up to ${BATCH_SIZE}. Keep this tab open until finished.`
        : 'Publishing batch to marketplace. Keep tab open until finished.',
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const { published, errors } = await publishBatchListingsAction(chunk.map((r) => r.id), token);
        allPublished.push(...published);
        Object.assign(allErrors, errors);
      } catch (err: any) {
        chunk.forEach((r) => {
          allErrors[r.id] = err?.message || 'Batch request failed';
        });
      }

      // Mark finished chunk state in UI progressively
      chunk.forEach((r) => {
        if (!allErrors[r.id]) {
          patch(r.id, { busy: false, error: undefined });
        } else {
          patch(r.id, { busy: false, error: allErrors[r.id] });
        }
      });
    }

    if (allPublished.length) {
      removeDraftIds(allPublished);
      setRows((rs) => rs.filter((r) => !allPublished.includes(r.id)));
      setSelected((s) => {
        const next = new Set(s);
        allPublished.forEach((id) => next.delete(id));
        return next;
      });
    }
    setPublishing(false);
    toast({
      title: `Published ${allPublished.length} of ${targetRows.length}`,
      description: allPublished.length < targetRows.length ? 'Some need fixing (e.g. price > $0), see red notes.' : 'All selected cards are now live!',
    });
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
        <Button variant="outline" size="sm" onClick={suggestAllPrices} disabled={checkingAllPrices} data-testid="suggest-sold-prices-btn">
          {checkingAllPrices ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5 text-primary" />}
          Suggest prices from sold comps
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">Category: Collector Cards</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}>{allSelected ? 'Clear selection' : 'Select all'}</Button>
        <Button variant="outline" size="sm" onClick={saveAll} disabled={!rows.some((r) => r.dirty)}>Save changes</Button>
        {selected.size > 0 && (
          <Button size="sm" variant="secondary" className="font-semibold" onClick={() => publishBatch(rows.filter((r) => selected.has(r.id)))} disabled={publishing}>
            {publishing ? 'Publishing…' : `Publish selected (${selected.size})`}
          </Button>
        )}
        <Button
          size="sm"
          className="bg-primary hover:bg-orange-700 text-primary-foreground font-bold"
          onClick={() => publishBatch(rows)}
          disabled={publishing || !rows.length}
          data-testid="publish-all-background-btn"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          {publishing ? 'Publishing…' : `Publish All (${rows.length})`}
        </Button>
        <span className="text-xs text-muted-foreground">{rows.length} draft{rows.length === 1 ? '' : 's'}</span>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className={`rounded-xl border bg-white p-2.5 flex gap-2.5 ${selected.has(r.id) ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
            <div className="flex flex-col items-center gap-1">
              <input type="checkbox" aria-label="Select" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[#f26c0d]" />
              {r.image
                ? <img src={r.image} alt="" className="h-24 w-[68px] rounded object-cover bg-muted" loading="lazy" />
                : <div className="h-24 w-[68px] rounded bg-muted" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <Input className="h-8 text-sm" value={r.title} onChange={(e) => patch(r.id, { title: e.target.value, dirty: true })} aria-label="Title" />
              <div className="flex gap-1">
                <Input className="h-8 w-20 text-sm" inputMode="decimal" value={r.price || ''} placeholder="$" onChange={(e) => patch(r.id, { price: parseFloat(e.target.value) || 0, dirty: true })} aria-label="Price" />
                <select className="h-8 flex-1 min-w-0 rounded-md border border-input bg-white px-1 text-sm" value={r.condition} onChange={(e) => patch(r.id, { condition: e.target.value, dirty: true })} aria-label="Condition">
                  {!CARD_CONDITIONS.includes(r.condition) && r.condition && <option value={r.condition}>{r.condition}</option>}
                  {CARD_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {r.suggestedPrice != null ? (
                  <button
                    type="button"
                    onClick={() => patch(r.id, { price: r.suggestedPrice!, dirty: true })}
                    className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 font-semibold hover:bg-emerald-100"
                    title="Click to apply suggested price from sold comps"
                  >
                    Sold median: ${r.suggestedPrice.toFixed(2)} ({r.compSampleSize} comps) — Use
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => suggestPriceForRow(r)}
                    disabled={r.checkingPrice || !r.title}
                    className="text-slate-600 hover:text-primary underline"
                  >
                    {r.checkingPrice ? 'Checking comps…' : 'Suggest price'}
                  </button>
                )}
                <Link href={`/sell/create?edit=${r.id}`} className="text-primary underline ml-auto">Full edit</Link>
                {r.dirty && <span className="text-muted-foreground">unsaved</span>}
                {r.busy && <span className="text-muted-foreground">publishing…</span>}
              </div>
              {r.error && <p className="text-xs text-red-600">{r.error}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
