'use client';

import { useState } from 'react';
import { ExternalLink, Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { priceCheckAction } from '@/app/actions/marketplace/price-check';
import type { PriceSuggestion } from '@/lib/price-intel/types';
import { PriceResult } from './PriceResult';

export function buildEbayAuSoldUrl(query: string): string {
    const q = encodeURIComponent(query.trim());
    return `https://www.ebay.com.au/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13`;
}

export function build130PointUrl(): string {
    return 'https://130point.com/sales/';
}

/** "Check market price" helper next to a listing's price field (create + edit). */
export function InlinePriceSuggestion({ title, category, price, productId, onUsePrice }: {
    title: string; category?: string; price?: number; productId?: string; onUsePrice?: (p: number) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PriceSuggestion | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showComps, setShowComps] = useState(false);
    const cleanTitle = (title || '').trim();

    const run = async () => {
        setBusy(true); setError(null);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error('Sign in to check prices.');
            const res = await priceCheckAction(token, { query: title, category, productId });
            if (!res.success) throw new Error(res.error);
            setResult(res.result);
        } catch (e: any) {
            setError(e?.message || 'Price check failed.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-3 rounded-xl border p-3" data-testid="inline-price-suggestion">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4" aria-hidden /> Sold comps & market price</p>
                <div className="flex flex-wrap items-center gap-1.5">
                    {cleanTitle.length >= 3 && (
                        <>
                            <Button type="button" variant="outline" size="sm" className="h-9 text-xs gap-1" asChild>
                                <a href={buildEbayAuSoldUrl(cleanTitle)} target="_blank" rel="noopener noreferrer" data-testid="ebay-sold-link">
                                    eBay AU Sold <ExternalLink className="h-3 w-3" />
                                </a>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 text-xs gap-1"
                                onClick={async () => {
                                    try { await navigator.clipboard.writeText(cleanTitle); } catch { /* ignore */ }
                                    window.open(build130PointUrl(), '_blank', 'noopener,noreferrer');
                                }}
                                title="Copies card title and opens 130point sales search"
                                data-testid="130point-sold-link"
                            >
                                130point <ExternalLink className="h-3 w-3" />
                            </Button>
                        </>
                    )}
                    <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={run} disabled={busy || cleanTitle.length < 3}>
                        {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />} {result ? 'Re-check' : 'Benched comps'}
                    </Button>
                </div>
            </div>
            {cleanTitle.length < 3 && <p className="text-xs text-muted-foreground">Add a title first to check sold comps on eBay AU, 130point, and Benched.</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
            {result && (
                <>
                    <PriceResult result={result} price={price} compact={!showComps} />
                    <div className="flex flex-wrap gap-2">
                        {result.median != null && onUsePrice && (
                            <Button type="button" size="sm" className="min-h-11" onClick={() => onUsePrice(result.median!)}>Use median (${result.median.toFixed(2)})</Button>
                        )}
                        <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setShowComps(s => !s)}>{showComps ? 'Hide comps' : 'Show comps'}</Button>
                    </div>
                </>
            )}
        </div>
    );
}
