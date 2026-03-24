import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return new NextResponse('Missing url parameter', { status: 400 });
    }

    // Fetch the image from Firebase Storage
    const response = await fetch(url);
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
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('OG Proxy Error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
