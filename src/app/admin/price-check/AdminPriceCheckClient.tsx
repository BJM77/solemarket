'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getLatestPriceReportAction, runPriceReportAction, type PriceReportRow } from '@/app/actions/marketplace/price-check';
import { PriceCheckTool } from '@/components/price-check/PriceCheckTool';

function Table({ rows, kind }: { rows: PriceReportRow[]; kind: 'below' | 'above' }) {
    if (!rows.length) return <p className="text-sm text-muted-foreground">None flagged.</p>;
    return (
        <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase">
                    <tr><th className="p-2">Listing</th><th className="p-2">Seller</th><th className="p-2 text-right">Price</th><th className="p-2 text-right">Market median</th><th className="p-2 text-right">{kind === 'below' ? '% below' : '% above'}</th><th className="p-2">Confidence</th></tr>
                </thead>
                <tbody>
                    {rows.map(r => (
                        <tr key={r.productId} className="border-t">
                            <td className="p-2"><Link className="underline" href={`/product/${r.productId}`}>{r.title}</Link></td>
                            <td className="p-2">{r.sellerName || r.sellerId}</td>
                            <td className="p-2 text-right">${r.price.toFixed(2)}</td>
                            <td className="p-2 text-right">{r.median != null ? `$${r.median.toFixed(2)}` : '-'}</td>
                            <td className="p-2 text-right font-bold">{r.pctBelow != null ? `${Math.abs(r.pctBelow)}%` : '-'}</td>
                            <td className="p-2">{r.confidence} ({r.sampleSize})</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default function AdminPriceCheckClient() {
    const { toast } = useToast();
    const [report, setReport] = useState<any>(null);
    const [running, setRunning] = useState(false);

    useEffect(() => {
        getCurrentUserIdToken().then(t => (t ? getLatestPriceReportAction(t) : null)).then(setReport).catch(() => {});
    }, []);

    const run = async () => {
        setRunning(true);
        try {
            const t = await getCurrentUserIdToken();
            const res = await runPriceReportAction(t || '', 100);
            if (!res.success) throw new Error(res.error);
            setReport(res.report);
        } catch (e: any) {
            toast({ title: 'Report failed', description: e?.message, variant: 'destructive' });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="space-y-10 p-4 md:p-8">
            <section className="space-y-4">
                <h1 className="text-3xl font-black tracking-tight">Price Check</h1>
                <p className="text-sm text-muted-foreground">Suggested price range from Benched sales, eBay AU, TCGplayer/Cardmarket (Pokemon) and PriceCharting.</p>
                <PriceCheckTool />
            </section>
            <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black">Pricing report</h2>
                        <p className="text-sm text-muted-foreground">
                            {report ? `Last run ${new Date(report.generatedAt).toLocaleString('en-AU', { timeZone: 'Australia/Perth' })} (Perth): ${report.scanned} listings, ${report.ok} OK, ${report.unknown} without data.` : 'Not run yet.'}
                        </p>
                    </div>
                    <Button onClick={run} disabled={running} className="min-h-11">{running && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Run report (100 newest listings)</Button>
                </div>
                {report && (
                    <>
                        <h3 className="font-bold">Priced far below market (profit leakage)</h3>
                        <Table rows={report.belowMarket || []} kind="below" />
                        <h3 className="font-bold">Priced far above market (unlikely to sell)</h3>
                        <Table rows={report.aboveMarket || []} kind="above" />
                    </>
                )}
            </section>
        </div>
    );
}
