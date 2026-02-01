'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, TrendingUp, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import { useUser } from '@/firebase';
import type { StructuredPricingResult } from '@/lib/gemini-parser';

interface PriceAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: {
        id: string;
        title: string;
        price: number;
    };
}

export default function PriceAssistantModal({ isOpen, onClose, product }: PriceAssistantModalProps) {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<StructuredPricingResult[]>([]);
    const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
    const [manualPrice, setManualPrice] = useState<string>(product.price.toString());
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { user } = useUser();

    const handleSearch = async () => {
        setLoading(true);
        setError(null);
        setResults([]);

        try {
            const token = await user?.getIdToken();
            const response = await fetch('/api/admin/pricing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    productId: product.id,
                    title: product.title
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch pricing data');

            setResults(data.comps || []);

            // Simple logic to suggest price: Median of comps
            if (data.comps && data.comps.length > 0) {
                const prices = data.comps.map((c: any) => c.finalPrice).sort((a: number, b: number) => a - b);
                const median = prices[Math.floor(prices.length / 2)];
                setSuggestedPrice(median);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            handleSearch();
            setManualPrice(product.price.toString());
            setSuccess(false);
        }
    }, [isOpen]);

    const handleUpdatePrice = async (priceToApply: number) => {
        setLoading(true);
        try {
            const productRef = doc(db, 'products', product.id);
            await updateDoc(productRef, {
                price: priceToApply,
                updatedAt: new Date()
            });
            setSuccess(true);
            setTimeout(() => onClose(), 1500);
        } catch (err: any) {
            setError('Failed to update product price');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                        Pricing Assistant: {product.title}
                    </DialogTitle>
                    <DialogDescription>
                        Researching eBay Australia sold listings for similar items.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {loading && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground italic">Scraping eBay & Analyzing with Gemini AI...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                            <div className="text-sm text-red-700">
                                <p className="font-semibold">Search Error</p>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                                    <p className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Suggested Market Price</p>
                                    <p className="text-2xl font-bold text-indigo-900">${suggestedPrice?.toFixed(2)} AUD</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-2 w-full bg-white hover:bg-indigo-600 hover:text-white border-indigo-200 transition-colors"
                                        onClick={() => handleUpdatePrice(suggestedPrice || 0)}
                                        disabled={loading || success}
                                    >
                                        Apply Suggestion
                                    </Button>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Current / Manual Price</p>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className="text-slate-400">$</span>
                                        <Input
                                            value={manualPrice}
                                            onChange={(e) => setManualPrice(e.target.value)}
                                            className="h-8 bg-white"
                                        />
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="mt-2 w-full"
                                        onClick={() => handleUpdatePrice(parseFloat(manualPrice))}
                                        disabled={loading || success}
                                    >
                                        Update Manually
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-700">Recent Sold Matches</h3>
                                <div className="border rounded-lg divide-y">
                                    {results.map((item, idx) => (
                                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex-1 pr-4 min-w-0">
                                                <p className="text-sm font-medium truncate" title={item.title}>{item.title}</p>
                                                <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.condition}</span>
                                                    <span>{item.soldDate}</span>
                                                    {item.shippingCost > 0 ? <span>+${item.shippingCost} ship</span> : <span className="text-emerald-600">Free Ship</span>}
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-1">
                                                <span className="font-bold text-slate-900 text-sm">${item.finalPrice.toFixed(2)}</span>
                                                <a
                                                    href={item.itemUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-indigo-500 hover:underline flex items-center gap-1"
                                                >
                                                    View <ExternalLink className="h-2.5 w-2.5" />
                                                </a>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-2 text-emerald-600">
                            <CheckCircle2 className="h-12 w-12 animate-in zoom-in duration-300" />
                            <p className="font-bold">Price Updated Successfully!</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t pt-4">
                    <Button variant="ghost" onClick={onClose} disabled={loading}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
