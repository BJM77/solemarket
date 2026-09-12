import { NextRequest, NextResponse } from 'next/server';
import { reportError } from '@/lib/error-handling';

export async function POST(request: NextRequest) {
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
