import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/firebase/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Missing product ID', { status: 400 });
    }

    const product = await getProductById(id);
    if (!product || !product.imageUrls || product.imageUrls.length === 0) {
      return new NextResponse('Product or images not found', { status: 404 });
    }

    const imageUrl = product.imageUrls[0];

    // Fetch the image from Firebase Storage
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error('OG Proxy failed to fetch from Firebase:', response.statusText);
      return new NextResponse('Failed to fetch upstream image', { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    // Stream the binary data back to Facebook with aggressive caching
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error: any) {
    console.error('OG Proxy Error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
