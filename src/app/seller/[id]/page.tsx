import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import type { Product, UserProfile } from '@/lib/types';
import { getPublicSellerInfo } from '@/app/actions/seller/public-seller';
import { getLiveListings } from '@/lib/seo/landing-listings.server';
import { toSearchLite } from '@/lib/search/inline';
import { pageOpenGraph } from '@/lib/seo/og';
import { createdSeconds } from '@/lib/seo/section-pages';
import SellerPageClient from './SellerPageClient';

// The listings grid reads search params, so render per request (listing data comes from a cached read).
export const dynamic = 'force-dynamic';

/** Listings rendered on the server; sellers with more fall back to the grid's client paging. */
const SSR_LIMIT = 60;

type Props = { params: Promise<{ id: string }> };

const loadSeller = cache(async (id: string) => getPublicSellerInfo(id));

const loadSellerListings = cache(async (id: string): Promise<Product[]> => {
  const live = await getLiveListings();
  return live
    .filter((p) => (p as any).sellerId === id && !!toSearchLite(p.id, p as unknown as Record<string, any>))
    .sort((a, b) => createdSeconds(b) - createdSeconds(a));
});

function sellerName(s: UserProfile): string {
  const d = s as any;
  // Same name the page's H1 shows.
  return String(d.businessName || d.displayName || d.storeName || 'Benched seller').trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const seller = await loadSeller(id);
  if (!seller) return { title: 'Seller not found', robots: { index: false } };
  const name = sellerName(seller);
  const listings = await loadSellerListings(id);
  const n = listings.length;
  // Profiles with no name set get a neutral title instead of "Benched seller – Seller Profile".
  const title = name === 'Benched seller' ? 'Seller Profile' : `${name} – Seller Profile`;
  const description = n > 0
    ? `Shop ${n} live ${n === 1 ? 'listing' : 'listings'} from ${name === 'Benched seller' ? 'this seller' : name} on Benched, Australia's marketplace for basketball cards and sneakers. Pay the seller directly by PayID or cash on pickup.`
    : `${name === 'Benched seller' ? 'This seller' : name} sells basketball cards and sneakers on Benched. Pay the seller directly by PayID or cash on pickup.`;
  const path = `/seller/${id}`;
  const image = (seller as any).photoURL;
  return {
    title,
    description,
    alternates: { canonical: path },
    // A storefront with nothing for sale is thin content; keep it out of search until it has stock.
    ...(n === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: pageOpenGraph({ title, description, path, type: 'website', ...(image ? { images: [{ url: image }] } : {}) }),
  };
}

export default async function SellerPage({ params }: Props) {
  const { id } = await params;
  const seller = await loadSeller(id);
  if (!seller) notFound();
  const listings = await loadSellerListings(id);
  // Keep the phone number out of the HTML; the client fetches it when "Show Phone Number" is tapped.
  const { phoneNumber, ...rest } = seller as UserProfile & { phoneNumber?: string };
  const initialSeller = { ...rest, hasPhone: !!phoneNumber } as UserProfile & { hasPhone: boolean };
  return (
    <SellerPageClient
      sellerId={id}
      initialSeller={initialSeller}
      initialListings={listings.length <= SSR_LIMIT ? listings : undefined}
    />
  );
}
