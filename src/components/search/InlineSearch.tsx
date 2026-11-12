'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X, Loader2, Clock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/ui';
import { getProductUrl } from '@/lib/utils/url';
import {
  DEFAULT_FILTERS, PRICE_BUCKETS, SORT_OPTIONS, LruCache, buildBrowseHref, cacheKey, formatAud, pushRecent,
  rowDetail, searchIndex, sizeOptions, type InlineFilters, type InlineResult, type SearchCategory, type SearchLite, type SearchSort,
} from '@/lib/search/inline';
import { getLoadedIndex, loadSearchIndex } from './search-index-client';

const DEBOUNCE_MS = 150;
const RESULT_LIMIT = 8;
const RECENT_KEY = 'benched_recent_searches_v1';
const resultCache = new LruCache<InlineResult>(40);
let cacheVersion = -1;

function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 5) : []; } catch { return []; }
}
function saveRecent(q: string) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(pushRecent(readRecent(), q))); } catch { /* ignore */ }
}

export function rowHref(row: SearchLite): string {
  if (row.kind === 'other') return `/product/${row.id}`;
  return getProductUrl({ id: row.id, title: row.title, category: row.kind === 'cards' ? 'Collector Cards' : 'Sneakers' });
}

/** State + results for one search box. Results are computed locally from the lite index. */
function useInlineSearch(open: boolean) {
  const [query, setQuery] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [filters, setFilters] = React.useState<InlineFilters>(DEFAULT_FILTERS);
  const [index, setIndex] = React.useState<{ rows: SearchLite[] | null; version: number }>({ rows: null, version: 0 });
  const [loadError, setLoadError] = React.useState(false);

  const ensureIndex = React.useCallback(() => {
    const now = getLoadedIndex();
    if (now.rows) { setIndex(now); return; }
    let alive = true;
    loadSearchIndex()
      .then(() => { if (alive) { setIndex(getLoadedIndex()); setLoadError(false); } })
      .catch(() => { if (alive) setLoadError(true); });
    return () => { alive = false; };
  }, []);

  React.useEffect(() => { if (open) return ensureIndex(); }, [open, ensureIndex]);

  React.useEffect(() => {
    if (query === debounced) return;
    // Cached queries (and clearing the box) answer immediately; new ones wait for typing to settle.
    if (!query.trim() || resultCache.get(cacheKey(query, filters))) { setDebounced(query); return; }
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, debounced, filters]);

  const result = React.useMemo<InlineResult | null>(() => {
    if (!index.rows || !debounced.trim()) return null;
    if (cacheVersion !== index.version) { resultCache.clear(); cacheVersion = index.version; }
    const key = cacheKey(debounced, filters);
    const hit = resultCache.get(key);
    if (hit) return hit;
    const r = searchIndex(index.rows, debounced, filters, RESULT_LIMIT);
    resultCache.set(key, r);
    return r;
  }, [index, debounced, filters]);

  const sizes = React.useMemo(
    () => (index.rows && filters.category === 'shoes' ? sizeOptions(index.rows, debounced, filters) : []),
    [index, debounced, filters]
  );

  return {
    query, setQuery, debounced, filters, setFilters, result, sizes, ensureIndex,
    loading: !index.rows && !loadError, loadError, indexReady: !!index.rows,
  };
}

type SearchState = ReturnType<typeof useInlineSearch>;

function FilterBar({ s, compact }: { s: SearchState; compact?: boolean }) {
  const { filters, setFilters, sizes } = s;
  const set = (patch: Partial<InlineFilters>) => setFilters((f) => {
    const next = { ...f, ...patch };
    if (next.category !== 'shoes') next.size = undefined;
    return next;
  });
  const chip = (active: boolean) => cn(
    'shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
    active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-foreground hover:border-primary/60'
  );
  const selectCls = 'h-7 shrink-0 rounded-full border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  const cats: { v: SearchCategory; l: string }[] = [{ v: 'all', l: 'All' }, { v: 'shoes', l: 'Shoes' }, { v: 'cards', l: 'Cards' }];

  return (
    <div className={cn('border-b border-border px-3 py-2', compact ? 'space-y-2' : 'flex flex-wrap items-center gap-2')} data-testid="inline-search-filters">
      <div className={cn('flex items-center gap-1.5', compact && 'overflow-x-auto no-scrollbar -mx-1 px-1')} role="group" aria-label="Category">
        {cats.map((c) => (
          <button key={c.v} type="button" className={chip(filters.category === c.v)} aria-pressed={filters.category === c.v} onClick={() => set({ category: c.v })}>
            {c.l}
          </button>
        ))}
        {compact && PRICE_BUCKETS.map((b) => (
          <button key={b.id} type="button" className={chip(filters.price === b.id)} aria-pressed={filters.price === b.id}
            onClick={() => set({ price: filters.price === b.id ? undefined : b.id })}>
            {b.label}
          </button>
        ))}
      </div>
      <div className={cn('flex items-center gap-1.5', !compact && 'ml-auto')}>
        {filters.category === 'shoes' && sizes.length > 0 && (
          <select aria-label="Size" className={selectCls} value={filters.size || ''} onChange={(e) => set({ size: e.target.value || undefined })}>
            <option value="">Any size</option>
            {sizes.map((z) => <option key={z} value={z}>US {z}</option>)}
          </select>
        )}
        {!compact && (
          <select aria-label="Price" className={selectCls} value={filters.price || ''} onChange={(e) => set({ price: e.target.value || undefined })}>
            <option value="">Any price</option>
            {PRICE_BUCKETS.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        )}
        <select aria-label="Sort" className={selectCls} value={filters.sort} onChange={(e) => set({ sort: e.target.value as SearchSort })}>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}

interface PanelProps {
  s: SearchState;
  listboxId: string;
  activeIndex: number;
  setActiveIndex: (i: number) => void;
  recent: string[];
  onPick: (href: string, q?: string) => void;
  onRecent: (q: string) => void;
  compact?: boolean;
  className?: string;
}

function ResultsPanel({ s, listboxId, activeIndex, setActiveIndex, recent, onPick, onRecent, compact, className }: PanelProps) {
  const router = useRouter();
  const hasQuery = !!s.query.trim();
  const rows = s.result?.rows ?? [];
  const total = s.result?.total ?? 0;
  const browseHref = buildBrowseHref(s.query, s.filters);
  // Keep focus in the input when clicking rows/chips (native selects still need their own focus).
  const keep = (e: React.MouseEvent) => { if (!(e.target as HTMLElement).closest('select')) e.preventDefault(); };

  return (
    <div className={cn('flex flex-col overflow-hidden bg-background', className)} onMouseDown={keep}>
      {hasQuery && <FilterBar s={s} compact={compact} />}
      <ul id={listboxId} role="listbox" aria-label="Search results" className="flex-1 overflow-y-auto overscroll-contain py-1">
        {!hasQuery && recent.map((q, i) => (
          <li key={q} id={`${listboxId}-opt-${i}`} role="option" aria-selected={activeIndex === i}
            onMouseEnter={() => setActiveIndex(i)} onClick={() => onRecent(q)}
            className={cn('flex cursor-pointer items-center gap-2 px-4 py-2 text-sm', activeIndex === i && 'bg-primary/10')}>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span className="truncate">{q}</span>
          </li>
        ))}
        {hasQuery && rows.map((row, i) => {
          const href = rowHref(row);
          const detail = rowDetail(row);
          return (
            <li key={row.id} id={`${listboxId}-opt-${i}`} role="option" aria-selected={activeIndex === i}
              onMouseEnter={() => { setActiveIndex(i); router.prefetch(href); }}
              onClick={() => onPick(href, s.query)}
              data-testid="inline-search-result"
              className={cn('flex cursor-pointer items-center gap-3 px-4 py-2', activeIndex === i && 'bg-primary/10')}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{row.title}</p>
                {detail && <p className="truncate text-[11px] text-muted-foreground">{detail}</p>}
              </div>
              <span className="shrink-0 text-sm font-bold text-foreground tabular-nums">{formatAud(row.price)}</span>
            </li>
          );
        })}
        {hasQuery && (
          <li id={`${listboxId}-opt-${rows.length}`} role="option" aria-selected={activeIndex === rows.length}
            onMouseEnter={() => setActiveIndex(rows.length)} onClick={() => onPick(browseHref, s.query)}
            data-testid="inline-search-see-all"
            className={cn('flex cursor-pointer items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-sm font-semibold text-primary', activeIndex === rows.length && 'bg-primary/10')}>
            <span>
              {s.loading ? 'Searching…'
                : s.result && total > 0 ? `See all ${total} result${total === 1 ? '' : 's'}`
                : s.result ? `No quick matches. Search all listings for “${s.query.trim()}”`
                : `Search all listings for “${s.query.trim()}”`}
            </span>
            {s.loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </li>
        )}
      </ul>
    </div>
  );
}

/** Shared keyboard + navigation behaviour for both layouts. */
function useSearchController(onClose: () => void) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const s = useInlineSearch(open);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [recent, setRecent] = React.useState<string[]>([]);
  const listboxId = React.useId().replace(/:/g, '') + '-listbox';

  React.useEffect(() => { if (open) setRecent(readRecent()); }, [open]);
  React.useEffect(() => { setActiveIndex(-1); }, [s.debounced, s.filters]);

  const close = React.useCallback(() => { setOpen(false); setActiveIndex(-1); onClose(); }, [onClose]);

  const go = React.useCallback((href: string, q?: string) => {
    if (q?.trim()) saveRecent(q);
    close();
    router.push(href);
  }, [close, router]);

  const hasQuery = !!s.query.trim();
  const optionCount = hasQuery ? (s.result?.rows.length ?? 0) + 1 : recent.length;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      if (optionCount) setActiveIndex((activeIndex + 1) % optionCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (optionCount) setActiveIndex(activeIndex <= 0 ? optionCount - 1 : activeIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!hasQuery) {
        if (activeIndex >= 0 && recent[activeIndex]) s.setQuery(recent[activeIndex]);
        return;
      }
      const rows = s.result?.rows ?? [];
      if (activeIndex >= 0 && activeIndex < rows.length) go(rowHref(rows[activeIndex]), s.query);
      else go(buildBrowseHref(s.query, s.filters), s.query);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (s.query && !open) s.setQuery('');
      close();
      (e.target as HTMLInputElement).blur();
    }
  };

  const activeId = activeIndex >= 0 && activeIndex < optionCount ? `${listboxId}-opt-${activeIndex}` : undefined;
  const comboProps = {
    role: 'combobox' as const,
    'aria-expanded': open,
    'aria-controls': listboxId,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant': open ? activeId : undefined,
    autoComplete: 'off',
    spellCheck: false,
    enterKeyHint: 'search' as const,
  };

  const panelProps: Omit<PanelProps, 'compact' | 'className'> = {
    s, listboxId, activeIndex, setActiveIndex, recent,
    onPick: go,
    onRecent: (q) => s.setQuery(q),
  };

  return { open, setOpen, s, close, onKeyDown, comboProps, panelProps, hasQuery, recent };
}

function useCloseOnRouteChange(close: () => void) {
  const pathname = usePathname();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) { first.current = false; return; }
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}

function useGlobalShortcut(handler: () => void) {
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handler(); }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [handler]);
}

const inputCls = 'h-10 w-full rounded-md border border-transparent bg-muted/60 pl-10 pr-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary/50 focus:bg-background focus:outline-none';

/** Desktop: the header bar itself; results drop down directly below it over a dimmed page. */
export function DesktopInlineSearch({ className }: { className?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const noop = React.useCallback(() => {}, []);
  const c = useSearchController(noop);
  const { open, setOpen, s, close } = c;
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  useCloseOnRouteChange(close);
  useGlobalShortcut(React.useCallback(() => {
    const el = inputRef.current;
    if (el && el.offsetParent !== null) { el.focus(); el.select(); setOpen(true); }
  }, [setOpen]));

  const showPanel = open && (c.hasQuery || c.recent.length > 0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open, close]);

  return (
    <div ref={rootRef} className={cn('relative', className)} data-testid="inline-search-desktop">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Find It Here"
        aria-label="Search listings"
        className={cn(inputCls, '[&::-webkit-search-cancel-button]:hidden')}
        value={s.query}
        onChange={(e) => { s.setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); s.ensureIndex(); }}
        onPointerEnter={() => { void loadSearchIndex().catch(() => {}); }}
        onKeyDown={c.onKeyDown}
        {...{ ...c.comboProps, 'aria-expanded': showPanel }}
      />
      {s.query ? (
        <button type="button" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => { s.setQuery(''); inputRef.current?.focus(); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      ) : (
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] font-medium text-muted-foreground xl:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      )}
      {showPanel && (
        <ResultsPanel
          {...c.panelProps}
          className="absolute left-0 top-[calc(100%+6px)] z-50 max-h-[min(70vh,560px)] w-[max(100%,560px)] rounded-xl border border-border shadow-2xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
        />
      )}
      {mounted && showPanel && createPortal(
        <div aria-hidden="true" data-testid="inline-search-backdrop" onClick={() => { close(); inputRef.current?.blur(); }}
          className="fixed inset-0 z-30 bg-black/40 animate-in fade-in-0 duration-150" />,
        document.body
      )}
    </div>
  );
}

/** Mobile: tapping the bar expands it to full width; results fill the screen below it. */
export function MobileInlineSearch({ className }: { className?: string }) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const noop = React.useCallback(() => {}, []);
  const c = useSearchController(noop);
  const { open, setOpen, s, close } = c;
  useCloseOnRouteChange(close);
  useGlobalShortcut(React.useCallback(() => {
    if (triggerRef.current && triggerRef.current.offsetParent !== null) setOpen(true);
  }, [setOpen]));

  React.useEffect(() => {
    if (!open) return;
    s.ensureIndex();
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { cancelAnimationFrame(t); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        onTouchStart={() => { void loadSearchIndex().catch(() => {}); }}
        aria-label="Search listings"
        data-testid="inline-search-mobile-trigger"
        className={cn('relative flex h-10 w-full items-center rounded-md bg-muted/60 pl-10 pr-3 text-left text-xs text-muted-foreground', className)}
      >
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
        <span className="truncate">{s.query || 'Find It Here'}</span>
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in fade-in-0 duration-150" data-testid="inline-search-mobile">
          <div className="flex items-center gap-2 border-b border-border px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" aria-hidden="true" />
              <input
                ref={inputRef}
                type="search"
                placeholder="Search shoes and cards"
                aria-label="Search listings"
                className={cn(inputCls, 'h-11 text-base [&::-webkit-search-cancel-button]:hidden')}
                value={s.query}
                onChange={(e) => s.setQuery(e.target.value)}
                onKeyDown={c.onKeyDown}
                {...c.comboProps}
              />
              {s.query && (
                <button type="button" aria-label="Clear search" onClick={() => { s.setQuery(''); inputRef.current?.focus(); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button type="button" onClick={close} className="shrink-0 px-1 text-sm font-semibold text-primary">Cancel</button>
          </div>
          <ResultsPanel {...c.panelProps} compact className="flex-1" />
        </div>,
        document.body
      )}
    </>
  );
}
