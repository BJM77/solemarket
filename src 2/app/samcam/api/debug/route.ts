import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      env: {
        googleApiKey: process.env.GOOGLE_API_KEY ? 'SET' : 'MISSING',
        firebaseApiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'SET' : 'MISSING',
        nodeEnv: process.env.NODE_ENV,
      },
      status: 'OK'
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
