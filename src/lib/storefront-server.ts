import 'server-only';
import { headers } from 'next/headers';
import { STOREFRONT_HEADER, getStorefrontConfig, resolveStorefrontId, type StorefrontConfig } from '@/config/storefronts';

/**
 * Active storefront for server components and route handlers.
 * Note: calling this opts the route into dynamic rendering, so only use it in
 * routes that are already dynamic or genuinely need per-host output.
 */
export async function getServerStorefront(): Promise<StorefrontConfig> {
  const h = await headers();
  const fromMiddleware = h.get(STOREFRONT_HEADER);
  if (fromMiddleware) return getStorefrontConfig(fromMiddleware);
  return getStorefrontConfig(resolveStorefrontId(h.get('x-forwarded-host') || h.get('host')));
}
