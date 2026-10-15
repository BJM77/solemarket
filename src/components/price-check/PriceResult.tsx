'use client';

import { ExternalLink } from 'lucide-react';
import type { PriceSuggestion } from '@/lib/price-intel/types';
import { priceWarning } from '@/lib/price-intel/stats';

const SOURCE_LABEL: Record<string, string> = { benched: 'Benched sold', ebay: 'eBay AU', pokemontcg: 'TCGplayer / Cardmarket', pricecharting: 'PriceCharting' };
const fmt = (n: number | null) => (n == null ? '-' : `$${n.toFixed(2)}`);

export function PriceResult({ result, price, compact = false }: { result: PriceSuggestion; price?: number; compact?: boolean }) {
    const warning = price && price > 0 ? priceWarning(price, result) : null;
    return (
        <div className="space-y-4" data-testid="price-result">
            {result.median == null ? (
                <p className="text-sm text-muted-foreground">No reliable comps found. Try a more specific title (set, card number, grade, size).</p>
            ) : (
                <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Low', result.low], ['Median', result.median], ['High', result.high]].map(([k, v]) => (
                        <div key={k as string} className={`rounded-xl border p-3 ${k === 'Median' ? 'border-primary bg-primary/5' : ''}`}>
                            <p className="text-xs font-bold uppercase text-muted-foreground">{k}</p>
                            <p className="text-lg font-black">{fmt(v as number | null)}</p>
                        </div>
                    ))}
                </div>
            )}
            {result.median != null && (
                <p className="text-xs text-muted-foreground">
                    Based on {result.sampleSize} comps, {result.confidence} confidence{result.cached ? ' (cached)' : ''}. AUD; USD/EUR converted at approximate rates.
                </p>
            )}
            {warning && <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm font-semibold text-amber-700 dark:text-amber-300">{warning}</p>}
            {!compact && (
                <>
                    <ul className="divide-y rounded-xl border text-sm">
                        {result.comps.slice(0, 25).map((c, i) => (
                            <li key={i} className="flex items-center justify-between gap-3 p-3">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{c.title}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {SOURCE_LABEL[c.source] || c.source} · {c.kind === 'active' ? 'asking price' : c.kind === 'sold' ? 'sold' : 'market price'}
                                        {c.date ? ` · ${String(c.date).slice(0, 10)}` : ''}
                                        {c.originalCurrency && c.originalCurrency !== 'AUD' ? ` · ${c.originalCurrency} ${c.originalPrice?.toFixed(2)}` : ''}
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <span className="font-black">${c.price.toFixed(2)}</span>
                                    {c.url && (
                                        <a href={c.url} target={c.url.startsWith('/') ? undefined : '_blank'} rel="noopener noreferrer" aria-label={`Open comp: ${c.title}`} className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted">
                                            <ExternalLink className="h-4 w-4" />
                                        </a>
                                    )}
                                </div>
                            </li>
                        ))}
                        {!result.comps.length && <li className="p-3 text-muted-foreground">No comps.</li>}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                        Sources: {result.providers.map(p => `${SOURCE_LABEL[p.source] || p.source} ${p.ok ? `(${p.count})` : `(off${p.note ? `: ${p.note}` : ''})`}`).join(' · ')}
                    </p>
                </>
            )}
        </div>
    );
}
