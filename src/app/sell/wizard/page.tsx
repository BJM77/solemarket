import type { Metadata } from 'next';
import ListingWizard from '@/components/sell/wizard/ListingWizard';

export const metadata: Metadata = {
  title: 'List an item | Benched',
  robots: { index: false, follow: false },
};

export default function ListingWizardPage() {
  return <ListingWizard />;
}
