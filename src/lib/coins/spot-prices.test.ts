import { describe, it, expect, vi } from 'vitest';
import { parseSpotPrices, parseUsdToAud, getSpotPrices, perGram, MINTED_METAL_URL } from './spot-prices';

// Trimmed copy of the real response (curl https://mintedmetal.com/api/prices.json, 16 Nov 2026).
const MINTED = {
  publisher: { name: 'Minted Metal', url: 'https://mintedmetal.com' },
  license: { name: 'Attribution 4.0 International (CC BY 4.0)', url: 'https://creativecommons.org/licenses/by/4.0/' },
  updatedAt: '2026-11-12T22:09:54.603Z',
  metals: {
    gold: { price: 4144.55, previousPrice: 4261.05, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
    silver: { price: 61.33, previousPrice: 65.02, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
    platinum: { price: 1731.85, previousPrice: 1768.8, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
    palladium: { price: 1219.25, previousPrice: 1256.75, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
    rhodium: { price: 9000, previousPrice: 9300, currency: 'USD', unit: 'troy oz', source: 'Umicore' },
  },
};
const FX = { amount: 1.0, base: 'USD', date: '2026-11-13', rates: { AUD: 1.4738 } };
const NOW = Date.parse('2026-11-15T23:00:00Z');

describe('spot price parsing', () => {
  it('converts USD/oz to AUD/oz for gold, silver, platinum and palladium', () => {
    const r = parseSpotPrices(MINTED, 1.4738, '2026-11-13', NOW)!;
    expect(r.quotes.map((q) => q.metal)).toEqual(['gold', 'silver', 'platinum', 'palladium']);
    expect(r.quotes[0].audPerOz).toBeCloseTo(4144.55 * 1.4738, 1);
    expect(r.quotes[1].audPerOz).toBeCloseTo(61.33 * 1.4738, 1);
    expect(r.quotes[0].changePct).toBeCloseTo(-2.73, 1);
    expect(r.sourceName).toBe('Minted Metal');
    expect(r.licenseName).toBe('CC BY 4.0');
    expect(r.fxDate).toBe('2026-11-13');
  });
  it('rejects stale, malformed or incomplete data', () => {
    expect(parseSpotPrices(MINTED, 1.47, null, Date.parse('2026-12-01T00:00:00Z'))).toBeNull();
    expect(parseSpotPrices(null, 1.47)).toBeNull();
    expect(parseSpotPrices('<html>Just a moment...</html>', 1.47)).toBeNull();
    expect(parseSpotPrices({ ...MINTED, metals: { gold: MINTED.metals.gold } }, 1.47, null, NOW)).toBeNull();
    expect(parseSpotPrices(MINTED, 0, null, NOW)).toBeNull();
    const eur = { ...MINTED, metals: { ...MINTED.metals, gold: { ...MINTED.metals.gold, currency: 'EUR' } } };
    expect(parseSpotPrices(eur, 1.47, null, NOW)).toBeNull();
  });
  it('reads the Frankfurter rate', () => {
    expect(parseUsdToAud(FX)).toEqual({ rate: 1.4738, date: '2026-11-13' });
    expect(parseUsdToAud({ base: 'EUR', rates: { AUD: 1.6 } })).toBeNull();
    expect(parseUsdToAud({ base: 'USD', rates: { AUD: 'oops' } })).toBeNull();
    expect(parseUsdToAud({ base: 'USD', rates: { AUD: 40 } })).toBeNull();
    expect(parseUsdToAud(undefined)).toBeNull();
  });
  it('converts per gram', () => {
    expect(perGram(3110.35)).toBeCloseTo(100, 1);
  });
});

const json = (body: unknown, ok = true, type = 'application/json') =>
  ({ ok, status: ok ? 200 : 503, headers: new Headers({ 'content-type': type }), json: async () => body }) as unknown as Response;

describe('getSpotPrices', () => {
  it('returns AUD prices when both sources answer', async () => {
    vi.setSystemTime(NOW);
    const fetcher = vi.fn(async (url: string) => (url === MINTED_METAL_URL ? json(MINTED) : json(FX)));
    const r = await getSpotPrices(fetcher as unknown as typeof fetch);
    expect(r?.quotes).toHaveLength(4);
    expect(fetcher).toHaveBeenCalledWith(MINTED_METAL_URL, expect.objectContaining({ next: expect.objectContaining({ revalidate: 900 }) }));
    vi.useRealTimers();
  });
  it('returns null (ticker hidden) when Minted Metal fails or sends a challenge page', async () => {
    const down = vi.fn(async (url: string) => (url === MINTED_METAL_URL ? json(null, false) : json(FX)));
    expect(await getSpotPrices(down as unknown as typeof fetch)).toBeNull();
    const challenge = vi.fn(async (url: string) => (url === MINTED_METAL_URL ? json({}, true, 'text/html') : json(FX)));
    expect(await getSpotPrices(challenge as unknown as typeof fetch)).toBeNull();
  });
  it('falls back to the second Frankfurter host, then returns null if both fail', async () => {
    vi.setSystemTime(NOW);
    let fxCalls = 0;
    const second = vi.fn(async (url: string) => {
      if (url === MINTED_METAL_URL) return json(MINTED);
      fxCalls += 1;
      return fxCalls === 1 ? json(null, false) : json(FX);
    });
    expect((await getSpotPrices(second as unknown as typeof fetch))?.usdToAud).toBe(1.4738);
    const none = vi.fn(async (url: string) => (url === MINTED_METAL_URL ? json(MINTED) : json(null, false)));
    expect(await getSpotPrices(none as unknown as typeof fetch)).toBeNull();
    vi.useRealTimers();
  });
  it('never throws when fetch throws', async () => {
    const boom = vi.fn(async () => { throw new Error('network'); });
    await expect(getSpotPrices(boom as unknown as typeof fetch)).resolves.toBeNull();
  });
});
