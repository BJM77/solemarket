'use client';

import { useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { priceCheckAction } from '@/app/actions/marketplace/price-check';
import type { PriceSuggestion } from '@/lib/price-intel/types';
import { PriceResult } from './PriceResult';

const CATEGORIES = ['Collector Cards', 'Sneakers', 'Apparel', 'Accessories'];

export function PriceCheckTool() {
    const { toast } = useToast();
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState('Collector Cards');
    const [price, setPrice] = useState('');
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<PriceSuggestion | null>(null);

    const run = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        try {
            const token = await getCurrentUserIdToken();
            if (!token) throw new Error('Please sign in.');
            const res = await priceCheckAction(token, { query, category });
            if (!res.success) throw new Error(res.error);
            setResult(res.result);
        } catch (err: any) {
            toast({ title: 'Price check failed', description: err?.message, variant: 'destructive' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-6">
            <form onSubmit={run} className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                <div className="space-y-2">
                    <Label htmlFor="pc-q">Item</Label>
                    <Input id="pc-q" value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g. Charizard 4/102 Base Set PSA 9" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pc-cat">Category</Label>
                    <select id="pc-cat" className="h-10 rounded-md border bg-background px-3 text-sm" value={category} onChange={e => setCategory(e.target.value)}>
                        {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="pc-price">Your price (optional)</Label>
                    <Input id="pc-price" className="w-32" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^0-9.]/g, ''))} />
                </div>
                <Button type="submit" className="min-h-11 gap-2" disabled={busy || query.trim().length < 3}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Check price
                </Button>
            </form>
            {result && <PriceResult result={result} price={Number(price) || undefined} />}
        </div>
    );
}
