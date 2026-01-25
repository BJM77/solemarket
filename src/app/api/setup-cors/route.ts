import { NextResponse } from 'next/server';
import { storage } from '@/lib/firebase/admin'; // Use our robust admin export

export async function GET() {
  try {
    const bucket = storage.bucket(); // Uses default bucket
    // Or specify explicit bucket if needed: storage.bucket('studio-8322868971-8ca89.appspot.com');

    await bucket.setCorsConfiguration([
      {
        origin: ["*"],
        method: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
        responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
        maxAgeSeconds: 3600
      }
    ]);

    return NextResponse.json({ 
      status: 'SUCCESS', 
      message: `CORS configured for bucket: ${bucket.name}`,
      bucketName: bucket.name 
    });
  } catch (error: any) {
    console.error("CORS Setup Error:", error);
    return NextResponse.json({ 
      status: 'ERROR', 
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
