'use client';

import { useState } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { priceCheckAction } from '@/app/actions/marketplace/price-check';
import type { PriceSuggestion } from '@/lib/price-intel/types';
import { PriceResult } from './PriceResult';

/** "Check market price" helper next to a listing's price field (create + edit). */
export function InlinePriceSuggestion({ title, category, price, productId, onUsePrice }: {
    title: string; category?: string; price?: number; productId?: string; onUsePrice?: (p: number) => void;
}) {
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PriceSuggestion | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showComps, setShowComps] = useState(false);

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
                <p className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4" aria-hidden /> Market price</p>
                <Button type="button" variant="outline" size="sm" className="min-h-11" onClick={run} disabled={busy || (title || '').trim().length < 3}>
                    {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {result ? 'Re-check' : 'Check market price'}
                </Button>
            </div>
            {(title || '').trim().length < 3 && <p className="text-xs text-muted-foreground">Add a title first.</p>}
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
