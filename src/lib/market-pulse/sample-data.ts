import type { SaleDataPoint } from './aggregation';

/**
 * Market Pulse is a preview. Until Benched has enough completed sales to build
 * a real index, the figures come from this small, made-up sample so the page
 * layout can be shown. Every place that shows them must say so.
 */
export const MARKET_PULSE_IS_SAMPLE = true;

export const MARKET_PULSE_SAMPLE_NOTICE =
  'Sample data: these figures are illustrative examples, not real Benched sales. Live prices will replace them once there are enough completed sales.';

const DAY = 86_400_000;

/** Example sales by market slug (made up for the preview). */
export function getSampleMarketData(slug: string, now = Date.now()): SaleDataPoint[] {
  if (slug === 'jordan-1') {
    return [
      { id: '1', title: 'Jordan 1 Retro High Chicago', price: 612, soldAt: new Date(now - 2 * DAY), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
      { id: '2', title: 'Jordan 1 Retro High Chicago', price: 540, soldAt: new Date(now - 5 * DAY), category: 'shoes', isVaultVerified: false, grade: 'Lightly Used' },
      { id: '3', title: 'Jordan 1 Retro High Chicago', price: 738, soldAt: new Date(now - 10 * DAY), category: 'shoes', isVaultVerified: true, grade: 'Brand New' },
      { id: '4', title: 'Jordan 1 Retro High Chicago', price: 490, soldAt: new Date(now - 15 * DAY), category: 'shoes', isVaultVerified: false, grade: 'Used' },
    ];
  }
  return [];
}
