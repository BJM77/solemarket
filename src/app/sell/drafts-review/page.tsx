import type { Metadata } from 'next';
import DraftReviewGrid from '@/components/bulk/DraftReviewGrid';

export const metadata: Metadata = { title: 'Review card drafts', robots: { index: false, follow: false } };

export default function DraftsReviewPage() {
  return (
    <main className="container mx-auto max-w-6xl px-4 py-6 bg-white">
      <h1 className="text-2xl font-bold mb-4">Review drafts</h1>
      <DraftReviewGrid />
    </main>
  );
}
