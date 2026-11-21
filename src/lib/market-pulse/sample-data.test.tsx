import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GET } from '@/app/api/market-pulse/route';
import { SampleDataNotice } from '@/components/market-pulse/SampleDataNotice';
import { MARKET_PULSE_SAMPLE_NOTICE, getSampleMarketData } from './sample-data';

describe('Market Pulse sample data', () => {
  it('the notice says plainly that the figures are sample data', () => {
    render(<SampleDataNotice />);
    expect(screen.getByRole('note').textContent).toMatch(/^Sample data:.*not real Benched sales/);
  });

  it('the JSON feed marks the data as sample', async () => {
    const index = await (await GET(new Request('https://benched.au/api/market-pulse'))).json();
    expect(index.isSampleData).toBe(true);
    expect(index.notice).toBe(MARKET_PULSE_SAMPLE_NOTICE);

    const report = await (await GET(new Request('https://benched.au/api/market-pulse?slug=jordan-1'))).json();
    expect(report.isSampleData).toBe(true);
    expect(report.description).toMatch(/sample data/i);
    expect(report.data.volume).toBeGreaterThan(0);
  });

  it('only the preview market has sample sales', () => {
    expect(getSampleMarketData('jordan-1').length).toBeGreaterThan(0);
    expect(getSampleMarketData('kobe-6')).toEqual([]);
  });
});
