
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getClubBySlug, getClubProducts } from '@/app/actions/clubs';
import ProductGrid from '@/components/products/ProductGrid';

export const revalidate = 120;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) return { title: 'Club not found', robots: { index: false } };
  return {
    title: `${club.name} | Club Marketplace`,
    description: club.tagline || `Shop listings from ${club.name} on Benched.`,
    alternates: { canonical: `/club/${club.slug}` },
  };
}

export default async function ClubPage({ params }: Props) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);
  if (!club) notFound();
  const products = await getClubProducts(club.sellerIds);

  return (
    <main className="min-h-screen bg-white">
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-10 flex items-center gap-5">
          {club.logoUrl ? (
            <img src={club.logoUrl} alt={`${club.name} logo`} className="h-20 w-20 object-contain rounded-lg bg-white border border-slate-200 p-2" />
          ) : (
            <div className="h-20 w-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
              {club.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm text-primary font-medium"><Link href="/clubs">Clubs</Link></p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{club.name}</h1>
            {club.tagline && <p className="text-slate-600 mt-1">{club.tagline}</p>}
            {club.location && <p className="text-sm text-slate-500 mt-1">{club.location}</p>}
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-10">
        <h2 className="text-xl font-semibold text-slate-900 mb-6">
          {products.length} {products.length === 1 ? 'listing' : 'listings'} from {club.name}
        </h2>
        {products.length === 0 ? (
          <p className="text-slate-600">No listings yet. Check back soon.</p>
        ) : (
          <ProductGrid products={products} />
        )}
      </section>
    </main>
  );
}
