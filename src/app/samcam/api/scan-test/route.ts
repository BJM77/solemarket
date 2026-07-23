import { NextResponse } from 'next/server';
import { quickScan } from '@/samcam/ai/flows/quick-scan';

export async function POST(request: Request) {
  try {
    const { imageData } = await request.json();
    
    if (!imageData) {
      return NextResponse.json(
        { error: 'No image data provided' },
        { status: 400 }
      );
    }

    // Test the quickScan function
    const result = await quickScan(imageData);
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Scan test error:', error);
    
    return NextResponse.json({
      error: error.message || 'Scan failed',
      timestamp: new Date().toISOString(),
      suggestion: 'Check Google API key and model availability'
    }, { status: 500 });
  }
}
