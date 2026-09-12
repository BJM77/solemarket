import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'GOOGLE_API_KEY not set in environment variables',
      }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const textModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const textPrompt = 'What is 2+2? Answer in one word.';
    
    const textResult = await textModel.generateContent(textPrompt);
    const textResponse = await textResult.response;
    const text = textResponse.text();

    return NextResponse.json({
      success: true,
      textModelTest: {
        model: 'gemini-1.5-flash',
        prompt: textPrompt,
        response: text.trim()
      }
    });
    
  } catch (error: any) {
    console.error('Google AI Text Test Error:', error);
    return NextResponse.json({
      error: error.message || 'Unknown error',
    }, { status: 500 });
  }
}
