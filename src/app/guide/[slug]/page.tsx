
import { notFound } from 'next/navigation';
import GuidePageTemplate from '@/../.gemini/skills/seo-guide-generator/assets/GuidePageTemplate'; // Importing directly from the skill asset for now
import { getActiveProductIds, getProductById } from '@/lib/firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import type { Product } from '@/lib/types';

// Helper to read the guide content
async function getGuideContent(slug: string) {
    const filePath = path.join(process.cwd(), 'src/content/guides', `${slug}.json`);
    if (!fs.existsSync(filePath)) {
        return null;
    }
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
}

// Helper to fetch related products (mock logic for now, or real if keywords match)
async function getRelatedProducts(topic: string): Promise<Product[]> {
    // In a real app, we'd search Algolia/Firestore for "Pokemon 1999"
    // For now, we'll just fetch a few active products to populate the grid
    const ids = await getActiveProductIds(4);
    const products = await Promise.all(ids.map(id => getProductById(id)));
    return products.filter((p): p is Product => p !== null);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const content = await getGuideContent(slug);
    
    if (!content) return { title: 'Guide Not Found' };

    return {
        title: content.title,
        description: content.metaDescription,
        openGraph: {
            title: content.title,
            description: content.metaDescription,
            type: 'article',
        }
    };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
    const slug = (await params).slug;
    const content = await getGuideContent(slug);

    if (!content) {
        notFound();
    }

    const relatedProducts = await getRelatedProducts(content.title);

    return (
        <GuidePageTemplate content={content} relatedProducts={relatedProducts} />
    );
}
