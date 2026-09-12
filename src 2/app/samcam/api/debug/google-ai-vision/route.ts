import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'GOOGLE_API_KEY not set in environment variables',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Test with the SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test 1: Simple text model
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const textPrompt = 'What is 2+2? Answer in one word.';
    
    const textResult = await textModel.generateContent(textPrompt);
    const textResponse = await textResult.response;
    const text = textResponse.text();

    // Test 2: Try to use vision (with a simple base64 image or description)
    const visionModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Use a simple base64 encoded 1x1 white pixel
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    const visionPrompt = 'Describe what you see in one word.';
    const visionResult = await visionModel.generateContent([
      visionPrompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: testImageBase64,
        },
      },
    ]);
    
    const visionResponse = await visionResult.response;
    const visionText = visionResponse.text();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      apiKey: {
        exists: true,
        firstChars: apiKey.substring(0, 8) + '...'
      },
      textModelTest: {
        model: 'gemini-1.5-flash',
        prompt: textPrompt,
        response: text.trim()
      },
      visionModelTest: {
        model: 'gemini-1.5-flash (vision)',
        prompt: visionPrompt,
        response: visionText.trim(),
        note: 'Used a 1x1 white pixel for vision test'
      }
    });
    
  } catch (error: any) {
    console.error('Google AI Vision Test Error:', error);
    
    return NextResponse.json({
      error: error.message || 'Unknown error',
      errorDetails: {
        name: error.name,
        code: error.code,
        status: error.status,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      timestamp: new Date().toISOString(),
      suggestion: 'Check that: 1) API key is valid, 2) Billing is enabled, 3) gemini-1.5-flash model is available in your region'
    }, { status: 500 });
  }
}
