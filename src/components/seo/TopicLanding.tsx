import Link from 'next/link';
import type { Metadata } from 'next';
import { SEO_TOPICS, type SEOTopic } from '@/config/seo-topics';
import type { Product } from '@/lib/types';
import ProductGrid from '@/components/products/ProductGrid';
import TopicSchema from '@/components/seo/TopicSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import { pageOpenGraph } from '@/lib/seo/og';

export type TopicSection = 'cards' | 'shoes';

/** FAQ shown on topic pages (and published as FAQPage JSON-LD). Keep it true to how Benched works. */
export function topicFaq(topic: SEOTopic, section: TopicSection): { question: string; answer: string }[] {
  const noun = section === 'cards' ? 'cards' : 'sneakers';
  return [
    {
      question: `How do I pay for ${topic.searchQuery} ${noun} on Benched?`,
      answer: 'You pay the seller directly by PayID (the details are on your Benched order page) or with cash when you pick up in Perth. Benched does not take the payment.',
    },
    {
      question: `Does Benched charge fees on ${topic.searchQuery} ${noun}?`,
      answer: 'No. There is no platform fee for buyers or sellers. Postage, if the seller offers it, is shown on the listing.',
    },
    {
      question: `How do I check a ${topic.searchQuery} listing before buying?`,
      answer: section === 'cards'
        ? 'Look at the photos and condition notes, check the grading company and cert number on graded slabs, and message the seller with any questions. With cash on pickup you can inspect the card before you pay.'
        : 'Look at the photos, size and condition notes, and message the seller with any questions. With cash on pickup you can inspect the pair before you pay.',
    },
  ];
}

export function topicMetadata(topic: SEOTopic, section: TopicSection, liveCount: number): Metadata {
  const path = `/${section}/${topic.slug}`;
  return {
    title: topic.title,
    description: topic.description,
    keywords: topic.keywords,
    alternates: { canonical: path },
    // Landing pages with nothing for sale are thin; keep them out of search until stock arrives.
    ...(liveCount === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: pageOpenGraph({ title: topic.title, description: topic.description, path }),
  };
}

export default function TopicLanding({ topic, section, listings }: { topic: SEOTopic; section: TopicSection; listings: Product[] }) {
  const path = `/${section}/${topic.slug}`;
  const faq = topicFaq(topic, section);
  const sectionName = section === 'cards' ? 'Basketball Cards' : 'Sneakers';
  return (
    <div className="min-h-screen pb-20">
      <TopicSchema topic={topic} urlPath={path} listings={listings} />
      <BreadcrumbSchema items={[{ name: 'Home', item: '/' }, { name: sectionName, item: `/${section}` }, { name: topic.h1, item: path }]} />
      <div className={section === 'cards' ? 'bg-orange-950 text-white py-12 lg:py-20 mb-8' : 'bg-card text-foreground py-12 lg:py-20 mb-8'}>
        <div className="container mx-auto px-4">
          <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">{topic.h1}</h1>
          <p className={section === 'cards' ? 'text-xl text-orange-100/80 max-w-3xl leading-relaxed' : 'text-xl text-foreground/80 max-w-3xl leading-relaxed'}>
            {topic.description}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-black uppercase mb-2">
          {listings.length > 0 ? `${listings.length} live ${listings.length === 1 ? 'listing' : 'listings'}` : 'No live listings right now'}
        </h2>
        {listings.length > 0 ? (
          <ProductGrid products={listings} priorityCount={4} />
        ) : (
          <p className="text-muted-foreground mb-4">
            Nothing matching {topic.searchQuery} is for sale at the moment. Browse all{' '}
            <Link href={`/${section}`} className="underline font-semibold">{sectionName.toLowerCase()}</Link>{' '}
            or <Link href="/sell" className="underline font-semibold">list yours</Link>.
          </p>
        )}
        <p className="mt-6 text-sm">
          <Link href={`/${section}`} className="underline font-semibold">See all {sectionName.toLowerCase()} on Benched</Link>
        </p>
      </div>

      <div className="container mx-auto px-4 mt-16 pt-16 border-t border-slate-100 dark:border-white/10">
        <div className="max-w-4xl mb-12">
          <h2 className="text-3xl font-black mb-6 uppercase">{section === 'cards' ? 'Collecting' : 'Buying'} {topic.searchQuery} in Australia</h2>
          <p className="text-muted-foreground leading-relaxed mb-4 text-lg">
            Benched is a peer-to-peer marketplace for Australian collectors. Every listing is posted by a member of the
            community, and you deal with the seller directly.
          </p>
          <p className="text-muted-foreground leading-relaxed text-lg">
            Buyers pay the seller by PayID or cash on pickup in Perth. There is no platform fee for buyers or sellers.
          </p>
        </div>

        <div className="max-w-4xl bg-muted/40 dark:bg-card p-8 rounded-2xl">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faq.map((f) => (
              <div key={f.question}>
                <h3 className="font-bold text-lg mb-2">{f.question}</h3>
                <p className="text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
        <FAQSchema questions={faq} />

        <nav aria-label={`More ${sectionName} Collections`} className="max-w-4xl mt-12">
          <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-3">
            Explore More {sectionName} Collections
          </h2>
          <ul className="flex flex-wrap gap-2">
            {SEO_TOPICS.filter((t) => t.category === topic.category && t.slug !== topic.slug).map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/${section}/${t.slug}`}
                  className="inline-block rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-bold text-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  {t.h1}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
