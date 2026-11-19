'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';
import { pairPhotos, sortPhotos, swapPair, unpair, joinWithNext, movePair, removePair, type CardPair } from '@/lib/bulk/pairing';
import { TaskQueue, type TaskState } from '@/lib/bulk/queue';
import { createCardDraft } from '@/lib/bulk/process-card';
import { CONDITIONS } from '@/lib/listing-wizard/steps';
import DraftReviewGrid from './DraftReviewGrid';

interface Photo { id: string; name: string; lastModified: number; file: File; url: string }
type Result = Awaited<ReturnType<typeof createCardDraft>>;

let seq = 0;

export default function FastBulkClient() {
  const { user } = useUser();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [order, setOrder] = useState<'time' | 'name'>('time');
  const [pairs, setPairs] = useState<CardPair<Photo>[]>([]);
  const [states, setStates] = useState<Record<string, TaskState<Result>>>({});
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('');
  const [multiCardTier, setMultiCardTier] = useState<string>('');
  const [storefrontId, setStorefrontId] = useState<string>('basketball');
  const [showOptions, setShowOptions] = useState(false);
  const [stage, setStage] = useState<'pick' | 'pair' | 'upload' | 'review'>('pick');
  const [dragOver, setDragOver] = useState(false);
  const queueRef = useRef<TaskQueue<Result> | null>(null);

  const addFiles = (list: FileList | File[]) => {
    const imgs = Array.from(list).filter((f) => f.type.startsWith('image/'));
    const next = [...photos, ...imgs.map((file) => ({ id: `p${++seq}`, name: file.name, lastModified: file.lastModified, file, url: URL.createObjectURL(file) }))];
    setPhotos(next);
    setPairs(pairPhotos(sortPhotos(next, order)));
    if (next.length) setStage('pair');
  };
  const reorder = (o: 'time' | 'name') => { setOrder(o); setPairs(pairPhotos(sortPhotos(photos, o))); };
  const reset = () => { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); setPairs([]); setStates({}); setStage('pick'); };

  const enqueue = (q: TaskQueue<Result>, p: CardPair<Photo>) => {
    q.add(p.id, () => createCardDraft(user!.uid, p.front.file, p.back?.file ?? null, {
      price: parseFloat(price) || undefined,
      condition: condition || undefined,
      multiCardTier: multiCardTier ? (multiCardTier as any) : undefined,
      storefrontId: storefrontId ? (storefrontId as any) : undefined,
    }));
  };

  const start = () => {
    if (!user) { router.push('/sign-in?redirect=/sell/fast-bulk'); return; }
    const q = new TaskQueue<Result>({ concurrency: 3, retries: 1, onUpdate: (s) => setStates((cur) => ({ ...cur, [s.id]: s })) });
    queueRef.current = q;
    setStage('upload');
    pairs.forEach((p) => enqueue(q, p));
  };
  const retry = (p: CardPair<Photo>) => queueRef.current && enqueue(queueRef.current, p);
  const retryFailed = () => pairs.forEach((p) => states[p.id]?.status === 'error' && retry(p));

  const counts = useMemo(() => {
    const c = { done: 0, error: 0, active: 0 };
    pairs.forEach((p) => { const s = states[p.id]?.status; if (s === 'done') c.done++; else if (s === 'error') c.error++; else c.active++; });
    return c;
  }, [pairs, states]);
  const finished = stage === 'upload' && counts.active === 0;
  const draftIds = pairs.map((p) => states[p.id]?.result?.draftId).filter((x): x is string => !!x);

  if (stage === 'review') return <DraftReviewGrid ids={draftIds} />;

  return (
    <div className="space-y-4">
      {stage === 'pick' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          className={`rounded-2xl border-2 border-dashed p-8 text-center bg-white ${dragOver ? 'border-primary bg-orange-50' : 'border-slate-300'}`}
        >
          <p className="font-semibold mb-1">Select all your card photos</p>
          <p className="text-sm text-muted-foreground mb-4">Shoot each card front, then back. Photos 1+2 become card 1, 3+4 card 2, and so on.</p>
          <Button className="text-slate-900 font-semibold" onClick={() => inputRef.current?.click()}>Choose photos</Button>
          <p className="text-xs text-muted-foreground mt-2">or drag and drop them here</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }} data-testid="fast-bulk-input" />

      {stage !== 'pick' && (
        <div className="rounded-xl border border-border bg-white p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold">{pairs.length} cards from {photos.length} photos</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowOptions((v) => !v)}
                className="text-xs h-8"
              >
                {showOptions ? 'Hide Bulk Options' : '⚙ Bulk Card Options'}
              </Button>
              {stage === 'pair' && (
                <>
                  <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} className="h-8 text-xs">Add photos</Button>
                  <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-xs">Clear</Button>
                  <Button className="h-8 text-xs text-slate-900 font-semibold" onClick={start} disabled={!pairs.length}>Create {pairs.length} drafts</Button>
                </>
              )}
            </div>
          </div>

          {/* Collapsible Bulk Listing Options */}
          {showOptions && stage === 'pair' && (
            <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50/50 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">Default settings applied to all {pairs.length} cards:</span>
                <span className="text-muted-foreground">e.g. Set all to $5 or multi-buy tier</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <label className="font-medium">Default price (AUD)
                  <Input
                    className="h-8 text-xs mt-1"
                    inputMode="decimal"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 5"
                  />
                </label>
                <label className="font-medium">Default condition
                  <select
                    className="block w-full h-8 mt-1 rounded-md border border-input bg-white px-2 text-xs"
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="">AI guess</option>
                    {CONDITIONS['Collector Cards'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="font-medium">Multi-card deal
                  <select
                    className="block w-full h-8 mt-1 rounded-md border border-input bg-white px-2 text-xs"
                    value={multiCardTier}
                    onChange={(e) => setMultiCardTier(e.target.value)}
                  >
                    <option value="">None (Sell singly)</option>
                    <option value="bronze">Bronze (4 for $15 / $5 ea)</option>
                    <option value="silver">Silver (3 for $25 / $10 ea)</option>
                    <option value="gold">Gold (3 for $50 / $20 ea)</option>
                    <option value="platinum">Platinum (2 for $70 / $40 ea)</option>
                  </select>
                </label>
                <label className="font-medium">Storefront target
                  <select
                    className="block w-full h-8 mt-1 rounded-md border border-input bg-white px-2 text-xs"
                    value={storefrontId}
                    onChange={(e) => setStorefrontId(e.target.value)}
                  >
                    <option value="basketball">Benched (Cards & Kicks)</option>
                    <option value="pokemon">Pokémon & TCG</option>
                    <option value="coins">Coins & Bullion</option>
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[11px] text-muted-foreground">Quick presets:</span>
                <button
                  type="button"
                  onClick={() => { setPrice('5'); setMultiCardTier('bronze'); }}
                  className="rounded bg-white border border-slate-300 px-2 py-0.5 text-[11px] hover:border-primary font-medium"
                >
                  $5 Bronze Deal
                </button>
                <button
                  type="button"
                  onClick={() => { setPrice('5'); setMultiCardTier(''); }}
                  className="rounded bg-white border border-slate-300 px-2 py-0.5 text-[11px] hover:border-primary font-medium"
                >
                  $5 Flat Price
                </button>
                <button
                  type="button"
                  onClick={() => { setStorefrontId('pokemon'); }}
                  className="rounded bg-white border border-slate-300 px-2 py-0.5 text-[11px] hover:border-primary font-medium"
                >
                  Target Pokémon Hub
                </button>
              </div>
            </div>
          )}

          {stage === 'pair' && !showOptions && (
            <div className="flex flex-wrap items-end gap-2 text-xs">
              <label className="font-medium">Order by
                <select className="block h-8 rounded-md border border-input bg-white px-2 text-xs" value={order} onChange={(e) => reorder(e.target.value as any)}>
                  <option value="time">Capture time</option><option value="name">Filename</option>
                </select>
              </label>
              <label className="font-medium">Quick price
                <Input className="w-20 h-8 text-xs" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="$" />
              </label>
              {price && (
                <span className="text-xs text-muted-foreground self-center">Default: ${price}</span>
              )}
            </div>
          )}

          {stage === 'upload' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm">{counts.done} done · {counts.error} failed · {counts.active} to go</span>
              {counts.error > 0 && <Button variant="outline" size="sm" onClick={retryFailed}>Retry failed</Button>}
              <Button className="text-slate-900 font-semibold ml-auto" onClick={() => setStage('review')} disabled={!finished}>Review drafts</Button>
            </div>
          )}
        </div>
      )}
      {stage === 'upload' && (
        <div className="h-2 w-full rounded bg-slate-200 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${pairs.length ? (100 * (counts.done + counts.error)) / pairs.length : 0}%` }} /></div>
      )}

      {stage !== 'pick' && (
        <ul className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {pairs.map((p, i) => {
            const s = states[p.id];
            return (
              <li key={p.id} className="rounded-xl border border-border bg-white p-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Card {i + 1}</span>
                  {s && <span className={s.status === 'error' ? 'text-red-600' : s.status === 'done' ? 'text-green-700' : 'text-muted-foreground'}>
                    {s.status === 'done' ? (s.result?.identified ? 'Draft ✓' : 'Draft (no AI)') : s.status === 'error' ? 'Failed' : s.status === 'running' ? 'Working…' : 'Queued'}
                  </span>}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <img src={p.front.url} alt="Front" className="aspect-[5/7] w-full rounded object-cover bg-muted" />
                  {p.back ? <img src={p.back.url} alt="Back" className="aspect-[5/7] w-full rounded object-cover bg-muted" /> : <div className="aspect-[5/7] rounded bg-muted text-[10px] grid place-items-center text-muted-foreground">No back</div>}
                </div>
                {s?.status === 'done' && s.result && <p className="text-xs truncate" title={s.result.title}>{s.result.title}</p>}
                {s?.status === 'error' && <><p className="text-xs text-red-600 line-clamp-2">{s.error}</p><Button size="sm" variant="outline" className="h-7 w-full" onClick={() => retry(p)}>Retry</Button></>}
                {stage === 'pair' && (
                  <div className="flex flex-wrap gap-1">
                    {p.back && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPairs(swapPair(pairs, i))}>Swap</Button>}
                    {p.back && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPairs(unpair(pairs, i))}>Unpair</Button>}
                    {!p.back && pairs[i + 1] && !pairs[i + 1].back && <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setPairs(joinWithNext(pairs, i))}>Pair with next</Button>}
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" aria-label="Move up" onClick={() => setPairs(movePair(pairs, i, -1))} disabled={i === 0}>↑</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" aria-label="Move down" onClick={() => setPairs(movePair(pairs, i, 1))} disabled={i === pairs.length - 1}>↓</Button>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600" onClick={() => setPairs(removePair(pairs, i))}>Remove</Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
