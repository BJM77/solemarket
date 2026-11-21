import { Info } from 'lucide-react';
import { cn } from '@/lib/utils/ui';
import { MARKET_PULSE_SAMPLE_NOTICE } from '@/lib/market-pulse/sample-data';

/** Clear "sample data" label for Market Pulse figures (team-themed, readable on every theme). */
export function SampleDataNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      data-testid="market-pulse-sample-notice"
      className={cn('flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground', className)}
    >
      <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p>{MARKET_PULSE_SAMPLE_NOTICE}</p>
    </div>
  );
}
