import { Metadata } from 'next';
import Link from 'next/link';
import { SEO_GUIDES } from '@/config/guides';
import { Clock, User } from 'lucide-react';
import Image from 'next/image';

export const metadata: Metadata = {
    title: 'Collector Guides & Articles | Benched',
    description: 'Expert guides, authentication tips, and market analysis for sneakerheads and card collectors in Australia.',
    alternates: {
        canonical: '/guides',
    }
};

import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';

export default function GuidesIndexPage() {
    return (
        <div className="min-h-screen bg-background pb-20">
            <BreadcrumbSchema
                items={[
                    { name: 'Home', item: '/' },
                    { name: 'Collector Guides', item: '/guides' },
                ]}
            />
            {/* Header */}
            <div className="bg-slate-900 text-white py-20">
                <div className="container mx-auto px-4 max-w-5xl">
                    <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
                        Collector Guides
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl leading-relaxed">
                        Expert insights, authentication deep-dives, and market analysis for the Australian collecting community.
                    </p>
                </div>
            </div>

            {/* Grid */}
            <div className="container mx-auto px-4 max-w-5xl mt-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {SEO_GUIDES.map((guide) => (
                        <Link key={guide.slug} href={`/guides/${guide.slug}`} className="group relative bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-border flex flex-col h-full">
                            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                                <Image
                                    src={guide.coverImage}
                                    alt={guide.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 left-4">
                                    <span className="bg-background/90 backdrop-blur-sm text-foreground px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        {guide.category}
                                    </span>
                                </div>
                            </div>
                            <div className="p-8 flex flex-col flex-grow">
                                <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                    {guide.title}
                                </h3>
                                <p className="text-slate-600 dark:text-slate-400 mb-6 flex-grow leading-relaxed">
                                    {guide.excerpt}
                                </p>
                                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium pt-6 border-t border-border">
                                    <span className="flex items-center gap-1.5"><User className="w-4 h-4" /> {guide.author}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {guide.readingTime}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
