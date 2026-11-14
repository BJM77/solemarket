import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isKnownBrand, brandDisplayName } from '@/lib/seo/brands';
import { brandHasListings } from '@/lib/seo/brand-exists';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getBrandListings } from '@/lib/seo/landing-listings.server';
import { pageOpenGraph } from '@/lib/seo/og';

// The grid reads search params, so render per request (listings come from a cached read).
export const dynamic = 'force-dynamic';

/** Server-rendered first page; brands with more live listings than this fall back to client paging. */
const SSR_LIMIT = 60;

interface Props {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params;
  const displayBrand = brandDisplayName(brand);
  const known = isKnownBrand(brand);

  const title = `Buy ${displayBrand} in Australia`;
  const description = `${displayBrand} listings from Australian sellers on Benched. Pay the seller directly by PayID or cash on pickup.`;
  const path = `/brand/${brand.toLowerCase()}`;
  // Only curated brand pages with live stock are indexable; arbitrary /brand/<anything> URLs are not.
  const live = known ? await getBrandListings(displayBrand, SSR_LIMIT + 1) : [];
  return {
    title,
    description,
    alternates: {
      canonical: `https://benched.au${path}`,
    },
    ...(known && live.length > 0 ? {} : { robots: { index: false, follow: true } }),
    openGraph: pageOpenGraph({ title, description, path }),
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand } = await params;

  if (!brand) {
    notFound();
  }

  const displayBrand = brandDisplayName(brand);
  // Unknown brand with no listings: real 404 instead of an empty page with 200.
  if (!isKnownBrand(brand) && (await brandHasListings(displayBrand)) === false) {
    notFound();
  }

  // First page rendered on the server so listings are in the initial HTML.
  const live = await getBrandListings(displayBrand, SSR_LIMIT + 1);
  const initialData = live.length <= SSR_LIMIT ? { products: live, hasMore: false } : undefined;

  // Brand pre-applied (matches brand, subCategory or title keyword); the grid adds the
  // standard sort control, filter panel, chips and counts on top.
  return (
    <div className="pt-4">
      <InfiniteProductGrid
        pageTitle={displayBrand}
        pageDescription={`${displayBrand} listings from Australian sellers on Benched.`}
        intro={`${displayBrand} listings from Australian sellers. Pay the seller directly by PayID or cash on pickup.`}
        initialFilterState={{ subCategory: displayBrand, brand: displayBrand }}
        initialData={initialData}
        titleAsH1
      />
    </div>
  );
}
