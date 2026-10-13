import { ImageResponse } from 'next/og';
import { SITE_NAME } from '@/config/brand';

export const revalidate = 86400;

/** Branded 1200x630 default share image (replaces the stock Unsplash photo). */
export async function GET() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px', background: '#0a0a0a', color: 'white' }}>
        <div style={{ fontSize: 120, fontWeight: 900, letterSpacing: '-4px', color: '#f97316' }}>{SITE_NAME.toUpperCase()}</div>
        <div style={{ fontSize: 44, fontWeight: 700, marginTop: 24 }}>Sneakers · Collector Cards · Rare Coins</div>
        <div style={{ fontSize: 30, marginTop: 16, color: '#a3a3a3' }}>Australia&apos;s marketplace for collectors</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
