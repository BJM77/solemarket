import type { Metadata } from 'next';
import { STOREFRONTS } from '@/config/storefronts';
import { coinsPublicUrl } from '@/lib/storefront-routing';

export const COINS_SITE_NAME = STOREFRONTS.coins.name; // 'Benched Coins'

/** Metadata for a coins storefront page with its own canonical (benched.au/coins/... until launched). */
export function coinsPageMetadata({ title, description, path, noindex = false, absoluteTitle = false }: { title: string; description: string; path: string; noindex?: boolean; absoluteTitle?: boolean }): Metadata {
  const url = coinsPublicUrl(path);
  return {
    // The coins layout's "%s | Benched Coins" template only reaches child segments, so
    // pages in the /coins segment itself pass absoluteTitle.
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: { 'en-AU': url } },
    openGraph: { type: 'website', locale: 'en_AU', siteName: COINS_SITE_NAME, title, description, url },
    twitter: { card: 'summary', title, description },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
