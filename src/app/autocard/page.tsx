import type { Metadata } from 'next';
import Link from 'next/link';
import AutoCardCapture from '@/components/autocard/AutoCardCapture';

export const metadata: Metadata = {
  title: 'AutoCard – auto-capture trading card photos',
  description: 'Point your camera at a card on a plain white or black background and AutoCard captures a straight, cropped front and back automatically.',
  robots: { index: false, follow: false },
};

export default function AutoCardPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold mb-1">AutoCard</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Lay the card upright on a plain white or black surface. AutoCard takes the photo automatically once the card is
        lined up, steady and sharp. Front first, then the back.
      </p>
      <p className="text-sm mb-4 rounded-lg border border-border bg-muted/40 px-3 py-2">
        Prefer the quick way?{' '}
        <Link href="/sell/create" className="font-semibold text-primary underline underline-offset-2">
          Pick photos from your gallery and let AI fill the listing
        </Link>
        .
      </p>
      <AutoCardCapture />
    </main>
  );
}
