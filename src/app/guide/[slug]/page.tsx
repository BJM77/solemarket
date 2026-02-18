import { notFound } from 'next/navigation';
import GuidePageTemplate from '@/components/guides/GuidePageTemplate';
import { getActiveProducts } from '@/app/actions/products';
import path from 'path';
import fs from 'fs/promises';
import { Metadata } from 'next';

interface Props {
    params: Promise<{ slug: string }>;
}

async function getGuideContent(slug: string) {
    const filePath = path.join(process.cwd(), 'src/content/guides', `${slug}.json`);
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (e) {
        return null;
    }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const content = await getGuideContent(slug);

    if (!content) {
        return {
            title: 'Guide Not Found',
        };
    }

    return {
        title: `${content.title} | Ultimate Collector's Guide`,
        description: `Everything you need to know about ${content.title}. History, investment value, key items, and collecting strategy.`,
        openGraph: {
            title: `${content.title} - Collector's Guide`,
            description: `Complete guide to collecting ${content.title}.`,
            type: 'article',
        },
    };
}

export async function generateStaticParams() {
    const guidesDir = path.join(process.cwd(), 'src/content/guides');
    try {
        const files = await fs.readdir(guidesDir);
        return files
            .filter(file => file.endsWith('.json'))
            .map(file => ({
                slug: file.replace('.json', ''),
            }));
    } catch (e) {
        return [];
    }
}

export default async function GuidePage({ params }: Props) {
    const { slug } = await params;
    const content = await getGuideContent(slug);

    if (!content) {
        notFound();
    }

    // Fetch related products based on the guide title or keywords
    // We'll search for the first 2 words of the title to be broad enough
    // In a real app, the JSON could contain specific search tags
    const searchTerms = content.title.split(' ').slice(0, 2).join(' ');
    
    // Using existing action but we might want a specific search action here
    // For now, getting recent products and filtering client-side or just showing latest is a fallback
    // But let's try to be smart. We don't have a direct "search" action that returns products exposed to server components 
    // easily without duplicating logic. 
    // Let's use getActiveProducts and we'll trust the user to browse from there if no specific matches found
    // Or better, we can import `firestoreDb` and run a specific query here.
    
    const { firestoreDb } = await import('@/lib/firebase/admin');
    const productsRef = firestoreDb.collection('products');
    
    // Try to find products matching the title keywords
    // Note: Firestore text search is limited. We'll query for available items and filter in memory 
    // or rely on the "keywords" array if we implemented it.
    // Let's just fetch latest 12 available items for now to populate the grid
    // Ideally we would use Algolia/Typesense for this.
    
    const snapshot = await productsRef
        .where('status', '==', 'available')
        .orderBy('createdAt', 'desc')
        .limit(12)
        .get();
        
    const relatedProducts = snapshot.docs.map((doc: any) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            // Serialize timestamps
            createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
    }) as any[]; // Type casting to avoid complex serialization issues here

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Article',
                        headline: content.title,
                        description: `Everything you need to know about history, value, and collecting strategy for ${content.title}.`,
                        author: {
                            '@type': 'Organization',
                            name: 'Benched',
                            url: 'https://benched.au'
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'Benched',
                            logo: {
                                '@type': 'ImageObject',
                                url: 'https://benched.au/logo.png'
                            }
                        },
                        mainEntityOfPage: {
                            '@type': 'WebPage',
                            '@id': `https://benched.au/guide/${slug}`
                        }
                    })
                }}
            />
            <GuidePageTemplate content={content} relatedProducts={relatedProducts} />
        </>
    );
}
