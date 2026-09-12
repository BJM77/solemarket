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
    title: `Buy ${displayBrand} Sneakers & Collectibles | Benched`,
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

  // For the InfiniteProductGrid, we'll pass an initial filter state
  const initialFilters = {
    brand: [displayBrand]
  };

  return (
    <div className="container mx-auto px-4 py-8 mt-20">
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase tracking-tight mb-2">
          {displayBrand}
        </h1>
        <p className="text-slate-500 font-medium">
          Explore all authenticated {displayBrand} items available on Benched.
        </p>
      </div>

      <InfiniteProductGrid initialFilters={initialFilters} showFilters={true} />
    </div>
  );
}
