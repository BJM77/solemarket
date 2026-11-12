
'use client';

import { useEffect, useState } from 'react';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getOrderTaxInvoiceAction } from '@/app/actions/seller/super-seller';
import { formatPrice } from '@/lib/utils/format';

export function TaxInvoiceSummary({ orderId, status }: { orderId: string; status?: string }) {
  const [invoice, setInvoice] = useState<{ abn: string; businessName: string | null; incGst: number; gst: number; exGst: number; reference: string } | null>(null);

  useEffect(() => {
    if (!orderId || !['paid', 'completed'].includes(String(status || ''))) return;
    let cancelled = false;
    (async () => {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;
      const r = await getOrderTaxInvoiceAction(idToken, orderId);
      if (!cancelled && r.success) setInvoice(r.invoice);
    })();
    return () => { cancelled = true; };
  }, [orderId, status]);

  if (!invoice) return null;

  return (
    <div className="mt-4 rounded-xl border bg-muted/40 p-4 text-sm space-y-1" data-testid={`tax-invoice-${orderId}`}>
      <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Tax invoice summary</p>
      {invoice.businessName && <p className="font-semibold">{invoice.businessName}</p>}
      <p>ABN {invoice.abn}</p>
      <p>Reference {invoice.reference}</p>
      <p>Total (inc GST) ${formatPrice(invoice.incGst)}</p>
      <p>GST ${formatPrice(invoice.gst)}</p>
      <p>Total (ex GST) ${formatPrice(invoice.exGst)}</p>
    </div>
  );
}
