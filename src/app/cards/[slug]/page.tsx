
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopicBySlug, SEO_TOPICS } from '@/config/seo-topics';
import { getProducts } from '@/services/product-service';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import TopicSchema from '@/components/seo/TopicSchema';

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Trading Cards') {
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
    return SEO_TOPICS.filter(t => t.category === 'Trading Cards').map(t => ({
        slug: t.slug,
    }));
}

export default async function CardTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = getTopicBySlug(slug);

    if (!topic || topic.category !== 'Trading Cards') {
        notFound();
    }

    // Server-side fetch for the initial products
    const initialData = await getProducts({
        q: topic.searchQuery,
        category: 'Trading Cards',
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
                        category: 'Trading Cards'
                    }}
                    initialData={initialData}
                />
            </div>

            {/* SEO Content Section */}
            <div className="container mx-auto px-4 mt-20 pt-20 border-t border-slate-100">
                <div className="max-w-4xl">
                    <h2 className="text-2xl font-bold mb-6">Collecting {topic.searchQuery} in Australia</h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                        Discover the finest {topic.searchQuery} cards on Benched. Our platform connects serious Australian collectors with rare NBA and basketball cards. From graded singles to unopened wax, find exactly what you need to elevate your personal collection.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                        All high-value transactions are secured via DealSafe, ensuring that both buyers and sellers are protected in the Australian hobby community.
                    </p>
                </div>
            </div>
        </div>
    );
}
