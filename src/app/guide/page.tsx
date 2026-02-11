import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, Star, Zap } from 'lucide-react';

const FEATURED_GUIDES = [
    { category: 'Collector Cards', slug: 'michael-jordan', name: 'Michael Jordan Rookie Cards', icon: TrendingUp },
    { category: 'Collector Cards', slug: 'pokemon-base-set', name: 'Pokemon Base Set (1999)', icon: Zap },
    { category: 'Coins', slug: 'rare-australian-pennies', name: 'Rare Australian Pennies', icon: Star },
    { category: 'Collector Cards', slug: 'lebron-james', name: 'LeBron James Investment Guide', icon: BookOpen },
];

export default function GuideIndexPage() {
    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-background-dark/50 pb-20">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
                <div className="max-w-7xl mx-auto px-4 py-16 text-center">
                    <Badge className="mb-4 bg-primary/10 text-primary border-0 font-bold tracking-widest uppercase text-[10px]">
                        The Picksy Encyclopedia
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6">
                        Collector Investment Guides
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg text-gray-600 dark:text-gray-400">
                        Professional analysis, rarity tracking, and market trends for the world's most desired collectibles.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 mt-12">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    Featured Guides
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {FEATURED_GUIDES.map((guide) => (
                        <Link
                            key={guide.slug}
                            href={`/guide/${guide.category.toLowerCase().replace(/\s+/g, '-')}/${guide.slug}`}
                            className="group bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all"
                        >
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                                <guide.icon className="h-6 w-6" />
                            </div>
                            <Badge variant="secondary" className="mb-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-0 font-bold uppercase tracking-wider text-[10px]">
                                {guide.category}
                            </Badge>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {guide.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                Deep dive into {guide.name} market values, population reports, and investment outlook.
                            </p>
                            <div className="mt-6 flex items-center gap-2 text-primary font-bold text-sm">
                                View Guide
                                <div className="h-5 w-5 rounded-full border border-primary/20 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                    →
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
