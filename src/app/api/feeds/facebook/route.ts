import { NextResponse } from 'next/server';
import { firestoreDb } from '@/lib/firebase/admin';
import { SITE_URL } from '@/config/brand';

/**
 * Facebook Product Feed API
 * Generates an XML feed compatible with Meta Commerce Manager.
 * Documentation: https://www.facebook.com/business/help/120325381656392
 */

export async function GET() {
    try {
        const productsRef = firestoreDb.collection('products');
        const snapshot = await productsRef
            .where('status', '==', 'available')
            .orderBy('createdAt', 'desc')
            .limit(1000)
            .get();

        const items = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        let xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Benched.au Product Feed</title>
    <link>${SITE_URL}</link>
    <description>The premier marketplace for performance basketball shoes and collector cards.</description>
`;

        items.forEach((item: any) => {
            // Clean up description (remove HTML or excessive whitespace)
            const description = item.description?.replace(/<[^>]*>?/gm, '').substring(0, 5000) || 'Collector item from Benched.au';
            const condition = item.condition?.toLowerCase().includes('new') ? 'new' : 'used';
            
            xml += `    <item>
      <g:id>${item.id}</g:id>
      <g:title><![CDATA[${item.title}]]></g:title>
      <g:description><![CDATA[${description}]]></g:description>
      <g:link>${SITE_URL}/product/${item.id}</g:link>
      <g:image_link>${item.imageUrls?.[0] || ''}</g:image_link>
      <g:brand>${item.brand || item.manufacturer || 'Benched'}</g:brand>
      <g:condition>${condition}</g:condition>
      <g:availability>in stock</g:availability>
      <g:price>${item.price} AUD</g:price>
      <g:google_product_category>187</g:google_product_category>
      <g:item_group_id>${item.category || 'Collectibles'}</g:item_group_id>
    </item>
`;
        });

        xml += `  </channel>
</rss>`;

        return new NextResponse(xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': 's-maxage=3600, stale-while-revalidate',
            },
        });

    } catch (error: any) {
        console.error('Error generating Facebook feed:', error);
        return NextResponse.json({ error: 'Failed to generate feed' }, { status: 500 });
    }
}
