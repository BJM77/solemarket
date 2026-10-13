import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';

interface Props {
  params: Promise<{ brand: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brand } = await params;
  const decodedBrand = decodeURIComponent(brand).replace(/-/g, ' ');
  
  // Capitalize each word
  const displayBrand = decodedBrand
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `Buy ${displayBrand} Sneakers & Collectibles`,
    description: `Shop the latest and rarest ${displayBrand} sneakers, trading cards, and collectibles on Benched. Verified, safe, and secure.`,
    alternates: {
      canonical: `https://benched.au/brand/${brand.toLowerCase()}`,
    },
  };
}

export default async function BrandPage({ params }: Props) {
  const { brand } = await params;
  
  if (!brand) {
    notFound();
  }

  const decodedBrand = decodeURIComponent(brand).replace(/-/g, ' ');
  const displayBrand = decodedBrand
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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
