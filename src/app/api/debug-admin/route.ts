import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  const status = {
    envVarPresent: !!process.env.SERVICE_ACCOUNT_JSON,
    envVarLength: process.env.SERVICE_ACCOUNT_JSON?.length || 0,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    adminApps: admin.apps.length,
    initializationError: null as string | null,
  };

  try {
    if (!admin.apps.length) {
      // Try to initialize manually to catch the error
      const serviceAccountJson = process.env.SERVICE_ACCOUNT_JSON;
      if (serviceAccountJson) {
         const serviceAccount = JSON.parse(serviceAccountJson);
         admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
         });
      } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
         admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
      } else {
         throw new Error("No credentials found");
      }
    }
    // Try a simple read
    await admin.firestore().collection('products').limit(1).get();
    return NextResponse.json({ status: 'OK', details: status });
  } catch (error: any) {
    console.error("Debug Route Error:", error);
    return NextResponse.json({ 
      status: 'ERROR', 
      details: status,
      message: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
