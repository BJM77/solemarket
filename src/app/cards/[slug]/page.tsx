import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTopicBySlug, SEO_TOPICS } from '@/config/seo-topics';
import { getLandingListings } from '@/lib/seo/landing-listings.server';
import TopicLanding, { topicMetadata } from '@/components/seo/TopicLanding';

interface Props {
    params: Promise<{ slug: string }>;
}

// Listings are server-rendered from a cached live-listing read; refresh every 10 minutes.
export const revalidate = 600;

function topicFor(slug: string) {
    const topic = getTopicBySlug(slug);
    return topic && topic.category === 'Collector Cards' ? topic : undefined;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const topic = topicFor(slug);
    if (!topic) return { title: 'Not Found', robots: { index: false } };
    const listings = await getLandingListings(topic.searchQuery, 'cards');
    return topicMetadata(topic, 'cards', listings.length);
}

export async function generateStaticParams() {
    return SEO_TOPICS.filter(t => t.category === 'Collector Cards').map(t => ({ slug: t.slug }));
}

export default async function CardTopicPage({ params }: Props) {
    const { slug } = await params;
    const topic = topicFor(slug);
    if (!topic) notFound();
    const listings = await getLandingListings(topic.searchQuery, 'cards');
    return <TopicLanding topic={topic} section="cards" listings={listings} />;
}
