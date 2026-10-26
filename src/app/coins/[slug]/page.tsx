import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopicBySlug, SEO_TOPICS } from '@/config/seo-topics';
import { getProducts } from '@/services/product-service';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import TopicSchema from '@/components/seo/TopicSchema';

// Coin landing pages listed in the sitemap (e.g. /coins/1930-australian-penny).
// Without this route they fell through to the generic [section]/[slug] client page,
// which rendered with the homepage title/description and no topic copy.

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Coins') {
        return { title: 'Not Found' };
    }

    return {
        title: topic.title,
        description: topic.description,
        keywords: topic.keywords,
        alternates: { canonical: `/coins/${topic.slug}` },
        openGraph: {
            title: topic.title,
            description: topic.description,
            type: 'website',
            url: `/coins/${topic.slug}`,
        },
    };
}

export async function generateStaticParams() {
    return SEO_TOPICS.filter(t => t.category === 'Coins').map(t => ({
        slug: t.slug,
    }));
}

export default async function CoinTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Coins') {
        notFound();
    }

    let initialData;
    try {
        initialData = await getProducts({
            q: topic.searchQuery,
            category: 'Coins',
            page: 1,
            limit: 24
        });
    } catch (error) {
        console.error('Coin topic initial fetch failed:', error);
        initialData = undefined;
    }

    return (
        <div className="min-h-screen pb-20">
            <TopicSchema topic={topic} urlPath={`/coins/${topic.slug}`} />
            <div className="bg-amber-950 text-white py-16 lg:py-24 mb-12">
                <div className="container mx-auto px-4">
                    <div className="bg-amber-500/20 w-fit px-4 py-1 rounded-full text-amber-200 text-xs font-black uppercase tracking-widest mb-6">
                        Rare Coins
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
                        {topic.h1}
                    </h1>
                    <p className="text-xl text-amber-50/80 max-w-3xl leading-relaxed">
                        {topic.description}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4">
                <InfiniteProductGrid
                    pageTitle={topic.searchQuery}
                    pageDescription={`${topic.searchQuery} listings available now from Australian sellers.`}
                    initialFilterState={{
                        q: topic.searchQuery,
                        category: 'Coins'
                    }}
                    initialData={initialData}
                />
            </div>

            <div className="container mx-auto px-4 mt-20 pt-20 border-t border-slate-100 dark:border-white/10">
                <div className="max-w-4xl">
                    <h2 className="text-3xl font-black mb-6 uppercase">Collecting {topic.searchQuery} in Australia</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4 text-lg">
                        Find {topic.searchQuery} listings from Australian collectors on Benched. Check each listing&apos;s photos, grade and description, and message the seller through Benched if you have questions before you buy.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                        Perth buyers can arrange local cash pickup where the seller offers it.
                    </p>
                </div>
            </div>
        </div>
    );
}
