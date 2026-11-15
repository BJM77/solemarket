import { getSpotPrices, perGram, type SpotPrices } from '@/lib/coins/spot-prices';

const aud = (n: number, digits = 2) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);

function updatedLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-AU', { timeZone: 'Australia/Perth', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) + ' AWST';
  } catch {
    return '';
  }
}

/** Presentational ticker; exported for tests. */
export function SpotPriceTickerView({ prices }: { prices: SpotPrices }) {
  const updated = updatedLabel(prices.updatedAt);
  return (
    <div className="bg-slate-950 text-slate-100 text-xs" data-testid="coins-spot-ticker" aria-label="Indicative precious metal spot prices in AUD">
      <div className="container mx-auto max-w-screen-2xl px-4 py-2 flex flex-wrap items-center gap-x-5 gap-y-1">
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {prices.quotes.map((q) => (
            <li key={q.metal} className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="font-bold text-amber-400">{q.label}</span>
              <span className="font-semibold tabular-nums">{aud(q.audPerOz, q.audPerOz >= 1000 ? 0 : 2)}/oz</span>
              {q.metal === 'gold' || q.metal === 'silver' ? (
                <span className="text-slate-400 tabular-nums hidden sm:inline">({aud(perGram(q.audPerOz))}/g)</span>
              ) : null}
              {q.changePct !== null && (
                <span className={q.changePct >= 0 ? 'text-emerald-400 tabular-nums' : 'text-rose-400 tabular-nums'}>
                  {q.changePct >= 0 ? '▲' : '▼'} {Math.abs(q.changePct).toFixed(2)}%
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-slate-400 md:ml-auto">
          Indicative prices, not a dealer quote.{updated ? ` Updated ${updated}.` : ''}{' '}
          <a href={prices.sourceUrl} target="_blank" rel="noopener" className="underline hover:text-slate-200">Prices by Minted Metal</a>{' '}
          (<a href={prices.licenseUrl} target="_blank" rel="noopener license" className="underline hover:text-slate-200">{prices.licenseName}</a>), LBMA fixes in USD converted to AUD at the ECB rate via Frankfurter.
        </p>
      </div>
    </div>
  );
}

/** Server-cached spot ticker. Renders nothing if either price source is unavailable. */
export default async function SpotPriceTicker() {
  const prices = await getSpotPrices();
  if (!prices) return null;
  return <SpotPriceTickerView prices={prices} />;
}
