
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopicBySlug, SEO_TOPICS } from '@/config/seo-topics';
import { getProducts } from '@/services/product-service';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import TopicSchema from '@/components/seo/TopicSchema';
import FAQSchema from '@/components/seo/FAQSchema';

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
            <TopicSchema topic={topic} urlPath={`/shoes/${topic.slug}`} />
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

            {/* SEO Content Section & FAQs */}
            <div className="container mx-auto px-4 mt-20 pt-20 border-t border-slate-100 dark:border-white/10">
                <div className="max-w-4xl mb-12">
                    <h2 className="text-3xl font-black mb-6 uppercase">Buying {topic.searchQuery} in Australia</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4 text-lg">
                        Looking for authentic {topic.searchQuery} sneakers? At Benched, we specialize in high-performance basketball footwear and rare collectibles. Every pair listed on our marketplace is verified by our community and protected by DealSafe escrow.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                        Whether you are in Melbourne, Sydney, Brisbane or anywhere in Australia, we provide the safest way to upgrade your rotation with the most sought-after {topic.searchQuery} colorways without the excessive middle-man fees.
                    </p>
                </div>

                <div className="max-w-4xl bg-slate-50 dark:bg-card p-8 rounded-2xl">
                    <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-lg mb-2">Are the {topic.searchQuery} shoes here authentic?</h4>
                            <p className="text-muted-foreground">Yes. Every transaction on Benched goes through our verified peer-to-peer network. Funds are securely locked in DealSafe escrow until the buyer confirms the item matches the condition described.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">How much are selling fees for {topic.searchQuery}?</h4>
                            <p className="text-muted-foreground">Benched charges zero selling fees. If you list your {topic.searchQuery} for $250, you take home $250. We exclusively charge the buyer a tiny standard infrastructure fee at checkout.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Can I make an offer on {topic.searchQuery}?</h4>
                            <p className="text-muted-foreground">Many sellers on Benched allow price negotiations. For listings marked as negotiable, you can communicate directly with the seller to agree on a price before checking out.</p>
                        </div>
                    </div>
                </div>

                <FAQSchema questions={[
                    {
                        question: `Are the ${topic.searchQuery} shoes here authentic?`,
                        answer: `Yes. Every transaction on Benched goes through our verified peer-to-peer network. Funds are securely locked in DealSafe escrow until the buyer confirms the item matches the condition described.`
                    },
                    {
                        question: `How much are selling fees for ${topic.searchQuery}?`,
                        answer: `Benched charges zero selling fees. If you list your ${topic.searchQuery} for $250, you take home $250. We exclusively charge the buyer a tiny standard infrastructure fee at checkout.`
                    },
                    {
                        question: `Can I make an offer on ${topic.searchQuery}?`,
                        answer: `Many sellers on Benched allow price negotiations. For listings marked as negotiable, you can communicate directly with the seller to agree on a price before checking out.`
                    }
                ]} />
            </div>
        </div>
    );
}
