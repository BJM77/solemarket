import type { Metadata } from 'next';
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
      <AutoCardCapture />
    </main>
  );
}
