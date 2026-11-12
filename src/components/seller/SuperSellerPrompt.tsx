'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getCurrentUserIdToken } from '@/lib/firebase/auth';
import { getMySuperSellerStatusAction, type SuperSellerStatus } from '@/app/actions/seller/super-seller';

export function SuperSellerPrompt() {
  const [status, setStatus] = useState<SuperSellerStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const idToken = await getCurrentUserIdToken();
      if (!idToken) return;
      const r = await getMySuperSellerStatusAction(idToken);
      if (!cancelled && r.success) setStatus(r.status);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!status || status.hasValidAbn || !status.shouldPrompt) return null;

  const until = status.graceEndsAtMs
    ? new Date(status.graceEndsAtMs).toLocaleDateString('en-AU', { timeZone: 'Australia/Perth' })
    : null;

  return (
    <Alert className={`mb-6 ${status.newListingsPaused ? 'border-destructive/50' : 'border-amber-300'}`} data-testid="super-seller-prompt">
      <AlertTitle className="font-bold">{status.newListingsPaused ? 'New listings are paused' : 'Please add your ABN'}</AlertTitle>
      <AlertDescription className="space-y-3 text-sm">
        <p>
          You&apos;ve had more than {status.salesCountThreshold} sales in the last 7 days, or more than ${status.salesAmountThreshold.toLocaleString('en-AU')} in sales in the last 30 days
          (currently {status.count7d} sales this week and ${status.amount30d.toLocaleString('en-AU')} in 30 days).
          Please add your Australian Business Number in Seller settings.
        </p>
        {status.newListingsPaused ? (
          <p>{status.pauseMessage}</p>
        ) : (
          <p>
            {until
              ? `You have until ${until} (Perth time) to add it. After that, new listings will be paused until an ABN is added. Existing listings stay live.`
              : `You have ${status.graceDays} days to add it. After that, new listings will be paused until an ABN is added. Existing listings stay live.`}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Businesses may need to register for GST if their turnover is ${status.gstThresholdAud.toLocaleString('en-AU')} or more in a year. This is a factual threshold only — it is not tax advice.
        </p>
        <Button asChild size="sm"><Link href="/sell/settings">Add your ABN</Link></Button>
      </AlertDescription>
    </Alert>
  );
}
