
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

    if (!topic || topic.category !== 'Collector Cards') {
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
    return SEO_TOPICS.filter(t => t.category === 'Collector Cards').map(t => ({
        slug: t.slug,
    }));
}

export default async function CardTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Collector Cards') {
        notFound();
    }

    // Server-side fetch for the initial products
    const initialData = await getProducts({
        q: topic.searchQuery,
        category: 'Collector Cards',
        page: 1,
        limit: 24
    });

    return (
        <div className="min-h-screen pb-20">
            <TopicSchema topic={topic} urlPath={`/cards/${topic.slug}`} />
            <div className="bg-indigo-950 text-white py-16 lg:py-24 mb-12">
                <div className="container mx-auto px-4">
                    <div className="bg-indigo-500/20 w-fit px-4 py-1 rounded-full text-indigo-300 text-xs font-black uppercase tracking-widest mb-6">
                        Premium Collectibles
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
                        {topic.h1}
                    </h1>
                    <p className="text-xl text-indigo-100/80 max-w-3xl leading-relaxed">
                        {topic.description}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4">
                <InfiniteProductGrid
                    pageTitle={topic.searchQuery}
                    pageDescription={`The rarest ${topic.searchQuery} cards available now in Australia.`}
                    initialFilterState={{
                        q: topic.searchQuery,
                        category: 'Collector Cards'
                    }}
                    initialData={initialData}
                />
            </div>

            {/* SEO Content Section & FAQs */}
            <div className="container mx-auto px-4 mt-20 pt-20 border-t border-slate-100 dark:border-white/10">
                <div className="max-w-4xl mb-12">
                    <h2 className="text-3xl font-black mb-6 uppercase">Collecting {topic.searchQuery} in Australia</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4 text-lg">
                        Discover the finest {topic.searchQuery} cards on Benched. Our platform connects serious Australian collectors with rare NBA and basketball cards. From graded singles to unopened wax, find exactly what you need to elevate your personal collection.
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-lg">
                        All high-value transactions are secured via DealSafe, ensuring that both buyers and sellers are protected in the Australian hobby community.
                    </p>
                </div>

                <div className="max-w-4xl bg-indigo-50/50 dark:bg-card p-8 rounded-2xl">
                    <h3 className="text-2xl font-bold mb-6">Frequently Asked Questions</h3>
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-lg mb-2">Are the {topic.searchQuery} cards here authentic?</h4>
                            <p className="text-muted-foreground">Yes. Many cards on Benched are already PSA or BGS graded. For raw cards, every transaction goes through our verified peer-to-peer network. Funds are securely locked in DealSafe escrow until the buyer confirms the item matches the condition described.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">How much are selling fees for {topic.searchQuery} cards?</h4>
                            <p className="text-muted-foreground">Benched charges zero selling fees on all trading cards. If you sell your {topic.searchQuery} for $500, you keep the entire $500. We only charge the buyer a tiny standard infrastructure fee at checkout.</p>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg mb-2">Can I make an offer on {topic.searchQuery} cards?</h4>
                            <p className="text-muted-foreground">Many sellers on Benched allow price negotiations. For listings marked as negotiable, you can communicate directly with the seller to agree on a price before checking out.</p>
                        </div>
                    </div>
                </div>

                <FAQSchema questions={[
                    {
                        question: `Are the ${topic.searchQuery} cards here authentic?`,
                        answer: `Yes. Many cards on Benched are already PSA or BGS graded. For raw cards, every transaction goes through our verified peer-to-peer network. Funds are securely locked in DealSafe escrow until the buyer confirms the item matches the condition described.`
                    },
                    {
                        question: `How much are selling fees for ${topic.searchQuery} cards?`,
                        answer: `Benched charges zero selling fees on all trading cards. If you sell your ${topic.searchQuery} for $500, you keep the entire $500. We only charge the buyer a tiny standard infrastructure fee at checkout.`
                    },
                    {
                        question: `Can I make an offer on ${topic.searchQuery} cards?`,
                        answer: `Many sellers on Benched allow price negotiations. For listings marked as negotiable, you can communicate directly with the seller to agree on a price before checking out.`
                    }
                ]} />
            </div>
        </div>
    );
}
