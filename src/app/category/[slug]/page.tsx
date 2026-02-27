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
        title: 'Buy & Sell Performance Basketball Shoes Australia | Benched',
        h1: 'Performance Basketball Shoes',
        description: 'Shop verified authentic performance basketball shoes including Nike, Jordan, Curry, and KD. The premier hoop marketplace.',
        categoryName: 'Sneakers',
        seoText: `
      Benched is the destination for buying and selling performance basketball shoes. 
      From the latest Air Jordan releases to specialized Nike G.T. Cut and Kobe grails, our platform connects hoopers with trusted sellers.
      
      Every pair is verified for authenticity, ensuring you can play with confidence. 
      Whether you're looking for the ultimate court feel or rare player editions, Benched has you covered.
      Join the community today and experience the future of basketball shoe trading in Australia.
    `
    },
    'collector-cards': {
        title: 'Rare NBA & Basketball Collector Cards Australia | Benched',
        h1: 'Collector Cards Marketplace',
        description: 'Discover rare NBA and Basketball collector cards. Panini, Topps, and PSA graded sets for serious collectors.',
        categoryName: 'Collector Cards',
        seoText: `
      Benched is the specialized marketplace for basketball and NBA collector cards. 
      Explore a curated selection of rookie cards, autographs, and PSA-graded grails from top manufacturers like Panini and Topps.
      
      Our community focuses specifically on the intersection of basketball culture and card collecting. 
      Build your portfolio or find that one missing piece for your set with Benched.
    `
    },
    'accessories': {
        title: 'Basketball Accessories & Sneaker Care | Benched',
        h1: 'Basketball & Sneaker Accessories',
        description: 'Shop performance laces, cleaning kits, and display cases to keep your rotation fresh.',
        categoryName: 'Accessories',
        seoText: `
      Complete your setup with essential performance basketball and sneaker accessories. 
      From premium laces to deep cleaning kits and display solutions, find everything you need to maintain your rotation.
      
      Benched brings you the best accessory brands to help you care for and showcase your gear.
    `
    },
    'apparel': {
        title: 'Performance Apparel | Benched',
        h1: 'Basketball Apparel',
        description: 'Shop verified authentic basketball and lifestyle apparel.',
        categoryName: 'Apparel',
        seoText: `Shop verified authentic performance and lifestyle apparel on Benched.`
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
