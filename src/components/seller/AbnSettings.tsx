'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getMySuperSellerStatusAction, saveSellerAbnAction, exportSellerSalesAction, type SuperSellerStatus } from '@/app/actions/seller/super-seller';
import { Loader2 } from 'lucide-react';
import { SuperSellerPrompt } from '@/components/seller/SuperSellerPrompt';
import { GST_REGISTRATION_THRESHOLD_AUD } from '@/lib/super-seller/config';

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AbnSettings() {
  const { toast } = useToast();
  const [status, setStatus] = useState<SuperSellerStatus | null>(null);
  const [abn, setAbn] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [gstRegistered, setGstRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) { setLoading(false); return; }
      const r = await getMySuperSellerStatusAction(idToken);
      if (r.success) {
        setStatus(r.status);
        setAbn(r.status.abnFormatted || '');
        setBusinessName(r.status.businessName || '');
        setGstRegistered(r.status.gstRegistered);
      }
      setLoading(false);
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;
      const r = await saveSellerAbnAction(idToken, { abn, businessName, gstRegistered });
      if (r.success) {
        setStatus(r.status);
        setAbn(r.status.abnFormatted || abn);
        toast({ title: 'ABN saved', description: 'Your listings can now show a Super Seller badge.' });
      } else {
        toast({ title: 'Could not save ABN', description: r.error, variant: 'destructive' });
      }
    } finally {
      setSaving(false);
    }
  }

  async function onExport() {
    setExporting(true);
    try {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;
      const toMs = Date.now();
      const fromMs = toMs - 365 * 24 * 60 * 60 * 1000;
      const r = await exportSellerSalesAction(idToken, { fromMs, toMs });
      if (!r.success) {
        toast({ title: 'Export failed', description: r.error, variant: 'destructive' });
        return;
      }
      const header = r.gstRegistered
        ? ['Date', 'Reference', 'Buyer', 'Total (inc GST)', 'GST', 'Total (ex GST)']
        : ['Date', 'Reference', 'Buyer', 'Total'];
      const rows = [header, ...r.rows.map((row) => r.gstRegistered
        ? [row.date, row.reference, row.buyerName, String(row.incGst), String(row.gst ?? ''), String(row.exGst ?? '')]
        : [row.date, row.reference, row.buyerName, String(row.incGst)])];
      downloadCsv(`benched-sales-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <SuperSellerPrompt />
      <Card>
        <CardHeader>
          <CardTitle>ABN and Super Seller</CardTitle>
          <CardDescription>
            A valid ABN lets us show a Super Seller badge on your listings and, if you are GST-registered, GST breakdowns on your sales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4" data-testid="abn-settings-form">
            <div className="space-y-1.5">
              <Label htmlFor="abn">Australian Business Number</Label>
              <Input id="abn" value={abn} onChange={(e) => setAbn(e.target.value)} placeholder="11 digits" inputMode="numeric" autoComplete="off" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="biz">Business name (optional)</Label>
              <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <Label htmlFor="gst" className="text-sm">I am registered for GST</Label>
              <Switch id="gst" checked={gstRegistered} onCheckedChange={setGstRegistered} />
            </div>
            <p className="text-xs text-muted-foreground">
              Businesses may need to register for GST if their turnover is ${GST_REGISTRATION_THRESHOLD_AUD.toLocaleString('en-AU')} or more in a year. This is a factual threshold only — it is not tax advice.
            </p>
            <Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save ABN'}</Button>
            {status?.hasValidAbn && <p className="text-xs text-emerald-700">ABN {status.abnFormatted} is on file. Your listings can show the Super Seller badge.</p>}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sales export</CardTitle>
          <CardDescription>
            {status?.gstRegistered
              ? 'Download a CSV of your paid sales for the last year, including GST (price ÷ 11) and GST-exclusive amounts. Totals are treated as GST-inclusive.'
              : 'Download a CSV of your paid sales totals for the last year. GST columns are included only if you are GST-registered.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" onClick={onExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Download sales CSV'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
