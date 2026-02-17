import { Suspense } from 'react';
import InfiniteProductGridInner from '@/components/products/InfiniteProductGrid';
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
    'sneakers': {
        title: 'Buy & Sell Authentic Sneakers Australia | Benched',
        h1: 'Authentic Sneakers Marketplace',
        description: 'Shop verified authentic sneakers including Nike, Jordan, Adidas, Yeezy, and New Balance. Australia\'s premier sneaker marketplace.',
        categoryName: 'Sneakers',
        seoText: `
      Benched is Australia's premier destination for buying and selling authentic sneakers. 
      From the latest Air Jordan releases to rare Yeezys and Nike Dunks, our platform connects sneakerheads with trusted sellers.
      
      Every pair is verified for authenticity, ensuring you can cop with confidence. 
      Whether you're looking for deadstock heat or lightly worn grails, Benched has you covered.
      Join the community today and experience the future of sneaker trading in Australia.
    `
    },
    'accessories': {
        title: 'Sneaker Accessories & Care | Benched',
        h1: 'Sneaker Accessories',
        description: 'Shop laces, cleaning kits, display cases, and more to keep your kicks fresh.',
        categoryName: 'Accessories',
        seoText: `
      Complete your setup with essential sneaker accessories. 
      From premium laces to deep cleaning kits and display solutions, find everything you need to maintain your collection.
      
      Benched brings you the best accessory brands to help you care for and showcase your sneakers.
    `
    },
    'apparel': {
        title: 'Apparel | Benched',
        h1: 'Apparel',
        description: 'Shop verified authentic apparel.',
        categoryName: 'Apparel',
        seoText: `Shop verified authentic apparel on Benched.`
    }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const config = CATEGORY_CONFIGS[slug];
    if (!config) return { title: 'Browse Category | Benched' };

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
                <InfiniteProductGridInner
                    pageTitle=""
                    pageDescription=""
                    initialFilterState={{
                        category: config.categoryName,
                    }}
                    initialData={initialProductsData}
                />
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Guide: {config.h1}</h2>
                    <div className="prose prose-lg dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                        {config.seoText}
                    </div>
                </div>
            </div>
        </div>
    );
}
