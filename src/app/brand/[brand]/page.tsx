import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isKnownBrand, brandDisplayName } from '@/lib/seo/brands';
import { brandHasListings } from '@/lib/seo/brand-exists';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';

interface Props {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params;
  const displayBrand = brandDisplayName(brand);
  const known = isKnownBrand(brand);

  return {
    title: `Buy ${displayBrand} Sneakers & Collectibles`,
    description: `Shop the latest and rarest ${displayBrand} sneakers, trading cards, and collectibles on Benched. Verified, safe, and secure.`,
    alternates: {
      canonical: `https://benched.au/brand/${brand.toLowerCase()}`,
    },
    // Only curated brand pages are indexable; arbitrary /brand/<anything> URLs are not.
    ...(known ? {} : { robots: { index: false, follow: true } }),
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

  // Brand pre-applied (matches brand, subCategory or title keyword); the grid adds the
  // standard sort control, filter panel, chips and counts on top.
  return (
    <div className="pt-4">
      <InfiniteProductGrid
        pageTitle={displayBrand}
        pageDescription={`Explore all authenticated ${displayBrand} items available on Benched.`}
        intro={`Shop authentic ${displayBrand} from verified Australian sellers, with DealSafe escrow and Australia-wide shipping.`}
        initialFilterState={{ subCategory: displayBrand, brand: displayBrand }}
        titleAsH1
      />
    </div>
  );
}
