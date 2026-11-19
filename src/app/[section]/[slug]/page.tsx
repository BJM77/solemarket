
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { PageHeader } from "@/components/layout/PageHeader";
import MontageGrid from '@/components/products/MontageGrid';
import { getLandingListings } from '@/lib/seo/landing-listings.server';
import { pageOpenGraph } from '@/lib/seo/og';
import { isCardCategory, normalizeCategory } from '@/lib/constants/marketplace';

export const revalidate = 600;

interface Props {
    params: Promise<{ section: string; slug: string }>;
}

function toTitleCase(str: string) {
    if (!str) return '';
    return str.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { section, slug } = await params;
    const titleName = toTitleCase(slug);
    const normalized = normalizeCategory(section);
    const kind = isCardCategory(normalized) ? 'cards' : 'shoes';
    const listings = await getLandingListings(titleName, kind);
    const title = `Buy ${titleName} in Australia`;
    const description = `Shop ${titleName} listings from Australian collectors and sellers on Benched. Pay directly by PayID or cash on pickup.`;
    const path = `/${section}/${slug}`;
    return {
        title,
        description,
        alternates: { canonical: path },
        ...(listings.length === 0 ? { robots: { index: false, follow: true } } : {}),
        openGraph: pageOpenGraph({ title, description, path }),
    };
}

export default async function CategoryPage({ params }: Props) {
    const { section, slug } = await params;

    if (section === 'admin') notFound();
    if (section === 'listings') {
        // Legacy /listings/[id] shortcut redirects to /product/[id] which resolves to the canonical listing URL
        permanentRedirect(`/product/${slug}`);
    }

    const titleName = toTitleCase(slug);
    const normalized = normalizeCategory(section);
    const kind = isCardCategory(normalized) ? 'cards' : 'shoes';
    const products = await getLandingListings(titleName, kind);

    return (
        <div className="min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <PageHeader
                    title={titleName}
                    description={`Browse ${titleName} listings from Australian sellers on Benched.`}
                />
            </div>
            <MontageGrid products={products} />
        </div>
    );
}
