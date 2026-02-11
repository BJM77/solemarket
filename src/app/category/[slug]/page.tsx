import { Suspense } from 'react';
import InfiniteProductGrid from '@/components/products/InfiniteProductGrid';
import { getProducts } from '@/services/product-service';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface CategoryConfig {
    title: string;
    h1: string;
    description: string;
    seoText: string;
    categoryName: string; // The name used in Firestore
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
    'pokemon-cards': {
        title: 'Buy & Sell Pokemon Cards Australia | Picksy',
        h1: 'Buy & Sell Pokemon Cards Australia',
        description: 'Shop vintage and modern Pokemon cards on Picksy. From PSA graded Charizards to Base Set boosters, find your next grail here.',
        categoryName: 'Collector Cards', // We'll filter by this + keywords or a more specific sub-cat
        seoText: `
      Pokemon card collecting in Australia has seen a massive surge, with hobbyists and investors alike seeking out rare holographic cards from the 1999 Base Set to the latest modern releases. 
      At Picksy, we provide a secure platform for collectors to trade everything from raw jungle cards to high-grade PSA 10 slabs. 
      Whether you are looking for the iconic Shadowless Charizard or competitive staples for the Trading Card Game, our verified sellers offer a wide selection of authentic merchandise.
      
      We understand the importance of condition in the hobby, which is why we encourage detailed photos and transparency. 
      Our marketplace is built by collectors, for collectors, ensuring you find the best value for your collection or the highest return on your sales.
      Join thousands of Australian fans in the ultimate Pokemon trading experience.
    `
    },
    'nba-trading-cards': {
        title: 'NBA Trading Cards & Basketball Memorabilia | Picksy',
        h1: 'NBA Trading Cards & Basketball Memorabilia',
        description: 'Find rare NBA rookie cards, autographed jerseys, and basketball collectibles. Panini, Topps, and Upper Deck available.',
        categoryName: 'Collector Cards',
        seoText: `
      Explore the best in basketball card collecting. From 1986 Fleer Michael Jordan rookies to the latest Panini Prizm releases, Picksy is Australia's home for NBA trading cards. 
      The basketball card market has evolved into a global phenomenon, with brands like Panini Prizm, National Treasures, and Select leading the way in desirability.
      
      Collectors in Australia have a deep passion for the game, seeking out "Chase" cards, short-prints, and low-numbered "1 of 1" masterpieces. 
      Whether you are hunting for Luka Doncic, LeBron James, or the next rising star, our marketplace connects you with reputable sellers nationwide.
      Secure your investment with our escrow-style payments and verified seller program, designed to keep the hobby safe and professional.
    `
    }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const config = CATEGORY_CONFIGS[slug];
    if (!config) return { title: 'Browse Category | Picksy' };

    return {
        title: config.title,
        description: config.description,
        openGraph: {
            title: config.title,
            description: config.description,
            type: 'website',
        },
    };
}

export default async function CategorySEOPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const config = CATEGORY_CONFIGS[slug];

    if (!config) {
        notFound();
    }

    // Initial Server Fetch
    const initialProductsData = await getProducts({
        category: config.categoryName,
        q: slug.includes('pokemon') ? 'Pokemon' : (slug.includes('nba') ? 'NBA' : ''),
        page: 1,
        limit: 24
    });

    return (
        <div className="min-h-screen">
            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 py-12 md:py-20">
                <div className="container mx-auto px-4 text-center">
                    <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight mb-6">
                        {config.h1}
                    </h1>
                    <p className="text-xl text-gray-500 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
                        {config.description}
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <InfiniteProductGrid
                    pageTitle=""
                    pageDescription=""
                    initialFilterState={{
                        category: config.categoryName,
                        q: slug.includes('pokemon') ? 'Pokemon' : (slug.includes('nba') ? 'NBA' : '')
                    }}
                    initialData={initialProductsData}
                />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Expert Collecting Guide: {config.h1}</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                        {config.seoText}
                    </div>
                </div>
            </div>
        </div>
    );
}
