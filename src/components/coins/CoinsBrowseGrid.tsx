'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import ProductCard from '@/components/products/ProductCard';
import { CoinCategoryPills } from '@/components/coins/CoinCategoryPills';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/lib/utils/ui';
import type { Product } from '@/lib/types';
import { COIN_SUBCATEGORIES } from '@/lib/coin-listings';
import {
  COIN_TYPE_OPTIONS, GRADE_MIN_OPTIONS, PRICE_BUCKETS, PURITY_OPTIONS, WEIGHT_OPTIONS,
  activeCoinFilterCount, applyCoinFilters, availableCoinSorts, coinFacetOptions, coinFilterChips, coinFiltersToParams,
  coinsBrowseHeading, coinsBrowseHref, effectiveCoinSort, parseCoinFilters, removeCoinChip,
  type CoinFilters, type CoinSort, type SpotMap,
} from '@/lib/coins/filters';
import type { CoinMetal } from '@/lib/coins/facets';

const PAGE = 48;

const selectCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';
const inputCls = 'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500';
const chip = (active: boolean) => cn(
  'rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
  active ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-border bg-background text-foreground hover:border-amber-500/60',
);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-2 border-b border-border/60 py-4 last:border-0">
      <legend className="mb-2 text-xs font-black uppercase tracking-widest text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

const numOrUndef = (v: string): number | undefined => (v.trim() === '' || !Number.isFinite(Number(v)) ? undefined : Number(v));

/** Every Benched Coins filter, built from the listings themselves (so options always have matches). */
function CoinFilterPanel({ draft, setDraft, products }: { draft: CoinFilters; setDraft: (f: CoinFilters) => void; products: Product[] }) {
  const o = useMemo(() => coinFacetOptions(products as any[]), [products]);
  const set = (patch: Partial<CoinFilters>) => {
    const next: CoinFilters = { ...draft, ...patch };
    for (const k of Object.keys(next) as (keyof CoinFilters)[]) {
      const v = next[k];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) delete next[k];
    }
    setDraft(next);
  };
  const toggle = <T extends string>(list: T[] | undefined, v: T): T[] => (list?.includes(v) ? list.filter((x) => x !== v) : [...(list || []), v]);

  return (
    <div data-testid="coins-filter-panel">
      <Section title="Type">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!draft.coinType)} aria-pressed={!draft.coinType} onClick={() => set({ coinType: undefined })}>All</button>
          {COIN_TYPE_OPTIONS.map((t) => (
            <button key={t.value} type="button" className={chip(draft.coinType === t.value)} aria-pressed={draft.coinType === t.value} onClick={() => set({ coinType: draft.coinType === t.value ? undefined : t.value })}>{t.label}</button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="coin-f-sub">Category</label>
        <select id="coin-f-sub" className={selectCls} value={draft.subCategory || ''} onChange={(e) => set({ subCategory: e.target.value || undefined })}>
          <option value="">Any category</option>
          {COIN_SUBCATEGORIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </Section>

      {o.metals.length > 0 && (
        <Section title="Metal">
          <div className="flex flex-wrap gap-2">
            {o.metals.map((m) => (
              <button key={m.value} type="button" className={chip(!!draft.metals?.includes(m.value as CoinMetal))} aria-pressed={!!draft.metals?.includes(m.value as CoinMetal)}
                onClick={() => set({ metals: toggle(draft.metals, m.value as CoinMetal) })}>
                {m.label} <span className="opacity-60">({m.count})</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {(o.anyWeight || o.anyPurity) && (
        <Section title="Weight & purity">
          {o.anyWeight && (
            <div className="flex flex-wrap gap-2">
              {WEIGHT_OPTIONS.map((w) => (
                <button key={w.value} type="button" className={chip(draft.weight === w.value)} aria-pressed={draft.weight === w.value} onClick={() => set({ weight: draft.weight === w.value ? undefined : w.value })}>{w.label}</button>
              ))}
            </div>
          )}
          {o.anyPurity && (
            <>
              <label className="mt-3 block text-xs font-semibold text-muted-foreground" htmlFor="coin-f-purity">Purity (fineness)</label>
              <select id="coin-f-purity" className={selectCls} value={draft.purityMin ?? ''} onChange={(e) => set({ purityMin: numOrUndef(e.target.value) })}>
                <option value="">Any purity</option>
                {PURITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </>
          )}
        </Section>
      )}

      <Section title="Year">
        <div className="grid grid-cols-2 gap-2">
          <input aria-label="Year from" inputMode="numeric" className={inputCls} placeholder={o.years.min ? `From (${o.years.min})` : 'From'} value={draft.yearMin ?? ''} onChange={(e) => set({ yearMin: numOrUndef(e.target.value) })} />
          <input aria-label="Year to" inputMode="numeric" className={inputCls} placeholder={o.years.max ? `To (${o.years.max})` : 'To'} value={draft.yearMax ?? ''} onChange={(e) => set({ yearMax: numOrUndef(e.target.value) })} />
        </div>
      </Section>

      {(o.countries.length > 0 || o.mints.length > 0 || o.denominations.length > 0) && (
        <Section title="Country, mint & denomination">
          {o.countries.length > 0 && (
            <select aria-label="Country" className={selectCls} value={draft.country || ''} onChange={(e) => set({ country: e.target.value || undefined })}>
              <option value="">Any country</option>
              {o.countries.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.count})</option>)}
            </select>
          )}
          {o.mints.length > 0 && (
            <select aria-label="Mint" className={selectCls} value={draft.mint || ''} onChange={(e) => set({ mint: e.target.value || undefined })}>
              <option value="">Any mint / refiner</option>
              {o.mints.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.count})</option>)}
            </select>
          )}
          {o.denominations.length > 0 && (
            <select aria-label="Denomination" className={selectCls} value={draft.denomination || ''} onChange={(e) => set({ denomination: e.target.value || undefined })}>
              <option value="">Any denomination</option>
              {o.denominations.map((c) => <option key={c.value} value={c.value}>{c.label} ({c.count})</option>)}
            </select>
          )}
        </Section>
      )}

      {o.conditions.length > 0 && (
        <Section title="Condition">
          <div className="flex flex-wrap gap-2">
            {o.conditions.map((c) => (
              <button key={c.value} type="button" className={chip(!!draft.conditions?.includes(c.value))} aria-pressed={!!draft.conditions?.includes(c.value)} onClick={() => set({ conditions: toggle(draft.conditions, c.value) })}>
                {c.label} <span className="opacity-60">({c.count})</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section title="Grading">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(!draft.graded)} aria-pressed={!draft.graded} onClick={() => set({ graded: undefined, grader: undefined, gradeMin: undefined })}>Any</button>
          <button type="button" className={chip(draft.graded === 'graded')} aria-pressed={draft.graded === 'graded'} onClick={() => set({ graded: 'graded' })}>Graded (slabbed)</button>
          <button type="button" className={chip(draft.graded === 'raw')} aria-pressed={draft.graded === 'raw'} onClick={() => set({ graded: 'raw', grader: undefined, gradeMin: undefined })}>Raw (not graded)</button>
        </div>
        {o.anyGraded && draft.graded !== 'raw' && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <select aria-label="Grading company" className={selectCls} value={draft.grader || ''} onChange={(e) => set({ grader: e.target.value || undefined })}>
              <option value="">Any grader</option>
              {o.graders.map((g) => <option key={g.value} value={g.value}>{g.label} ({g.count})</option>)}
            </select>
            <select aria-label="Minimum grade" className={selectCls} value={draft.gradeMin ?? ''} onChange={(e) => set({ gradeMin: numOrUndef(e.target.value) })}>
              <option value="">Any grade</option>
              {GRADE_MIN_OPTIONS.map((g) => <option key={g} value={g}>{g}+</option>)}
            </select>
          </div>
        )}
      </Section>

      <Section title="Price (AUD)">
        <div className="flex flex-wrap gap-2">
          {PRICE_BUCKETS.map((b) => {
            const active = draft.priceMin === b.min && draft.priceMax === b.max;
            return (
              <button key={b.id} type="button" className={chip(active)} aria-pressed={active} onClick={() => set(active ? { priceMin: undefined, priceMax: undefined } : { priceMin: b.min, priceMax: b.max })}>{b.label}</button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <input aria-label="Minimum price" inputMode="decimal" className={inputCls} placeholder="Min $" value={draft.priceMin ?? ''} onChange={(e) => set({ priceMin: numOrUndef(e.target.value) })} />
          <input aria-label="Maximum price" inputMode="decimal" className={inputCls} placeholder="Max $" value={draft.priceMax ?? ''} onChange={(e) => set({ priceMax: numOrUndef(e.target.value) })} />
        </div>
      </Section>
    </div>
  );
}

export interface CoinsBrowseGridProps {
  /** Every live coin/bullion listing (the coins catalog is small, so filtering is instant in the browser). */
  products: Product[];
  /** AUD per oz spot prices (null hides the premium-over-spot sort). */
  spot: SpotMap | null;
  /** Filters from the URL on first render. */
  initialFilters?: CoinFilters;
  /** Fixed filters for landing pages (e.g. a topic's search), not shown as chips. */
  baseFilters?: CoinFilters;
  title?: string;
  description?: string;
  titleAsH1?: boolean;
  /** /coins/browse keeps filters in the URL; other pages link there instead. */
  syncUrl?: boolean;
  /** Hide the filter/sort controls (home page "latest" grid). */
  showControls?: boolean;
  /** Show at most this many listings (home page). */
  limit?: number;
}

/**
 * Benched Coins listing grid with coin and bullion filters and sorts. Uses the
 * same ProductCard tiles as the basketball site (photo fills the tile, one-line
 * title, Buy Now beside the price, corner badge), coins only.
 */
export default function CoinsBrowseGrid({
  products, spot, initialFilters = {}, baseFilters = {}, title, description, titleAsH1 = false, syncUrl = false, showControls = true, limit,
}: CoinsBrowseGridProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [filters, setFilters] = useState<CoinFilters>(initialFilters);
  const [draft, setDraft] = useState<CoinFilters>(initialFilters);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);

  // Back/forward and pill links change the URL: follow it.
  useEffect(() => {
    if (!syncUrl) return;
    const next = parseCoinFilters(params);
    setFilters(next);
    setDraft(next);
    setShown(PAGE);
  }, [params, syncUrl]);

  const apply = useCallback((next: CoinFilters) => {
    setFilters(next);
    setDraft(next);
    setShown(PAGE);
    if (syncUrl && typeof window !== 'undefined') {
      const qs = coinFiltersToParams(next).toString();
      window.history.replaceState(null, '', qs ? `${pathname}?${qs}` : pathname);
    }
  }, [pathname, syncUrl]);

  const anyFineWeight = useMemo(() => coinFacetOptions(products as any[]).anyFineWeight, [products]);
  const sorts = useMemo(() => availableCoinSorts({ spot, anyFineWeight }), [spot, anyFineWeight]);
  const sort: CoinSort = effectiveCoinSort(filters.sort, { spot, anyFineWeight });

  const combined = useMemo<CoinFilters>(() => ({ ...baseFilters, ...filters }), [baseFilters, filters]);
  const results = useMemo(() => applyCoinFilters(products as any[], combined, spot) as Product[], [products, combined, spot]);
  const draftCount = useMemo(() => applyCoinFilters(products as any[], { ...baseFilters, ...draft }, null).length, [products, baseFilters, draft]);
  const chips = coinFilterChips(filters);
  const filterCount = activeCoinFilterCount(filters);
  const visible = results.slice(0, limit ?? shown);

  // Load more tiles as the buyer scrolls.
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (limit || !sentinel.current || shown >= results.length) return;
    const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) setShown((n) => n + PAGE); }, { rootMargin: '600px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [limit, shown, results.length]);

  // Previous/Next on a listing opened from here stays inside these coin results, then the rest of the coins site.
  const listingCtx = useMemo(() => JSON.stringify({
    params: { coinsOnly: true, ...Object.fromEntries(coinFiltersToParams(combined)) },
    provider: 'firestore',
    cursor: null,
  }), [combined]);

  const heading = title ?? coinsBrowseHeading(filters);
  const Heading = titleAsH1 ? 'h1' : 'h2';
  const usesSpot = sort === 'premium-asc' || sort === 'ppo-asc';

  return (
    <div className="container mx-auto max-w-screen-2xl px-4 py-8" data-listing-ctx={listingCtx} data-testid="coins-browse-grid">
      <header className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Heading className="text-3xl font-black tracking-tight md:text-5xl">{heading}</Heading>
          <p className="mt-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground" data-testid="coins-result-count">
            {results.length} {results.length === 1 ? 'listing' : 'listings'}{description ? ` · ${description}` : ''}
          </p>
        </div>
        {showControls && (
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <label htmlFor="coins-sort" className="sr-only">Sort listings</label>
            <select id="coins-sort" data-testid="coins-sort" className={cn(selectCls, 'w-full sm:w-[230px]')} value={sort} onChange={(e) => apply({ ...filters, sort: e.target.value as CoinSort })}>
              {sorts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (v) setDraft(filters); }}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-10 shrink-0 gap-2" data-testid="coins-filters-trigger">
                  <SlidersHorizontal className="h-4 w-4 text-amber-600" />
                  Filters{filterCount ? ` (${filterCount})` : ''}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex w-full flex-col p-0 sm:max-w-md">
                <SheetHeader className="border-b border-border px-6 pb-4 pt-6">
                  <SheetTitle className="text-lg font-black">Filter coins &amp; bullion</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto px-6">
                  <CoinFilterPanel draft={draft} setDraft={setDraft} products={products} />
                </div>
                <SheetFooter className="flex-row gap-2 border-t border-border px-6 py-4">
                  <Button variant="ghost" className="flex-1" onClick={() => setDraft({ sort: filters.sort, q: filters.q })}>Clear</Button>
                  <Button className="flex-1 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400" data-testid="coins-filters-apply" onClick={() => { apply(draft); setOpen(false); }}>
                    Show {draftCount} {draftCount === 1 ? 'result' : 'results'}
                  </Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </header>

      {showControls && <CoinCategoryPills className="mb-4" />}

      {chips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2" data-testid="coins-active-filters">
          <span className="mr-1 text-xs font-black uppercase tracking-widest text-muted-foreground">Active:</span>
          {chips.map((c) => (
            <Badge key={`${c.key}-${c.value ?? ''}`} variant="secondary" className="gap-1.5 border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold">{c.label}</span>
              <button type="button" aria-label={`Remove ${c.label}`} onClick={() => apply(removeCoinChip(filters, c))} className="rounded-full p-0.5 hover:bg-amber-500/20"><X className="h-3.5 w-3.5" /></button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={() => apply({ sort: filters.sort, q: filters.q, coinType: filters.coinType, subCategory: filters.subCategory })}>Clear all</Button>
        </div>
      )}

      {usesSpot && showControls && (
        <p className="mb-4 text-xs text-muted-foreground" data-testid="coins-sort-note">
          {sort === 'premium-asc'
            ? 'Premium over spot compares each price with its metal content at the indicative spot price shown at the top of the page (not a dealer quote).'
            : 'Price per oz uses each listing’s weight and purity.'}{' '}
          Listings without a weight and purity are listed after the rest.
        </p>
      )}

      {visible.length > 0 ? (
        <div className="ml-[calc(50%-50vw)] grid w-screen max-w-[100vw] grid-cols-2 gap-3 overflow-hidden px-3 md:ml-0 md:w-auto md:max-w-full md:grid-cols-3 md:gap-x-6 md:gap-y-8 md:px-0 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {visible.map((p, i) => (
            <div key={p.id}>
              <ProductCard product={p} viewMode="grid" priority={i < 4} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border p-10 text-center" data-testid="coins-empty">
          <p className="text-lg font-bold">No coins or bullion match {products.length ? 'these filters' : 'yet'}.</p>
          {products.length > 0 ? (
            <Button variant="outline" className="mt-4" onClick={() => apply({})}>Clear filters</Button>
          ) : (
            <Link href="/coins/sell" className="mt-4 inline-flex rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950">List a coin</Link>
          )}
        </div>
      )}

      {!limit && shown < results.length && (
        <div ref={sentinel} className="mt-8 flex justify-center">
          <Button variant="outline" onClick={() => setShown((n) => n + PAGE)}>Show more</Button>
        </div>
      )}
      {limit && results.length > limit && (
        <div className="mt-8 flex justify-center">
          <Link href={coinsBrowseHref(filters)} className="inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800">See all {results.length} listings</Link>
        </div>
      )}
    </div>
  );
}
