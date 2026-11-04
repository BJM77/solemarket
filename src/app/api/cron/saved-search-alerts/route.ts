import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Moved to /api/jobs/saved-search-alerts (dedupe, opt-out, rate limits). Kept as a redirect for old schedulers. */
export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/api/jobs/saved-search-alerts', request.url), 307);
}
