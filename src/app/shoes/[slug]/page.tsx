
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopicBySlug, SEO_TOPICS } from '@/config/seo-topics';
import { getProducts } from '@/services/product-service';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Sneakers') {
        return { title: 'Not Found' };
    }

    return {
        title: topic.title,
        description: topic.description,
        keywords: topic.keywords,
        openGraph: {
            title: topic.title,
            description: topic.description,
            type: 'website',
        },
    };
}

export async function generateStaticParams() {
    return SEO_TOPICS.filter(t => t.category === 'Sneakers').map(t => ({
        slug: t.slug,
    }));
}

export default async function ShoeTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Sneakers') {
        notFound();
    }

    // Server-side fetch for the initial products
    const initialData = await getProducts({
        q: topic.searchQuery,
        category: 'Sneakers',
        page: 1,
        limit: 24
    });

    return (
        <div className="min-h-screen pb-20">
            <div className="bg-slate-900 text-white py-16 lg:py-24 mb-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
                        {topic.h1}
                    </h1>
                    <p className="text-xl text-slate-300 max-w-3xl leading-relaxed">
                        {topic.description}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4">
                <InfiniteProductGrid
                    pageTitle={`Available ${topic.searchQuery}`}
                    pageDescription={`Explore all authentic ${topic.searchQuery} listings on Benched.`}
                    initialFilterState={{
                        q: topic.searchQuery,
                        category: 'Sneakers'
                    }}
                    initialData={initialData}
                />
            </div>

            {/* SEO Content Section */}
            <div className="container mx-auto px-4 mt-20 pt-20 border-t border-slate-100">
                <div className="max-w-4xl">
                    <h2 className="text-2xl font-bold mb-6">Buying {topic.searchQuery} in Australia</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Looking for authentic {topic.searchQuery} sneakers? At Benched, we specialize in high-performance basketball footwear and rare collectibles. Every pair listed on our marketplace is verified by our community and protected by DealSafe escrow.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        Whether you are in Melbourne, Sydney, Brisbane or anywhere in Australia, we provide the safest way to upgrade your rotation with the most sought-after {topic.searchQuery} colorways.
                    </p>
                </div>
            </div>
        </div>
    );
}
