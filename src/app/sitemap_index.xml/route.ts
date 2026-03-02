import { NextResponse } from 'next/server';
import { getActiveProductCount } from '@/lib/firebase/firestore';

const PRODUCT_SITEMAP_SIZE = 5000;

export async function GET() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://benched.au';
        const totalProducts = await getActiveProductCount();
        const numberOfSitemaps = Math.max(1, Math.ceil(totalProducts / PRODUCT_SITEMAP_SIZE));

        let sitemaps = '';
        for (let i = 0; i < numberOfSitemaps; i++) {
            sitemaps += `
  <sitemap>
    <loc>${baseUrl}/sitemap/${i}.xml</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
  </sitemap>`;
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemaps}
</sitemapindex>`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
            },
        });
    } catch (error) {
        console.error("Sitemap index generation error:", error);
        return new NextResponse('Error generating sitemap index', { status: 500 });
    }
}
