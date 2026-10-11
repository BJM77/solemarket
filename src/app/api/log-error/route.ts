import { NextRequest, NextResponse } from 'next/server';
import { reportError } from '@/lib/error-handling';
import { checkRateLimit } from '@/lib/rate-limit-guard';

export async function POST(request: NextRequest) {
  if (!(await checkRateLimit('log-error', { limit: 20, windowSeconds: 60 }))) {
    return NextResponse.json({ success: false }, { status: 429 });
  }
  try {
    const body = await request.json();
    await reportError(body.message || 'Unknown Client Error', {
      ...body.context,
      clientTime: body.clientTime,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
