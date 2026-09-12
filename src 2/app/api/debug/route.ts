import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }
  return NextResponse.json({
    message: 'Debug endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      nodeEnv: process.env.NODE_ENV,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      hasServiceAccount: !!process.env.SERVICE_ACCOUNT_JSON || !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
      serviceAccountLength: (process.env.SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').length,
    },
    firebase: {
      adminAppsInitialized: admin.apps.length,
      appName: admin.apps[0]?.name || 'none',
      projectId: admin.apps[0]?.options?.projectId || 'not set',
    },
  });
}
