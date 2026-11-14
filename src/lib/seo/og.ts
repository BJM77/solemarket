import type { Metadata } from 'next';
import { brandConfig, SITE_NAME, SITE_URL } from '@/config/brand';

const siteUrl = (SITE_URL || 'https://benched.au').replace(/\/$/, '');

/** Absolute URL for a site path ("/cards" -> "https://benched.au/cards"). */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

/** The site's default share image as an absolute URL. */
export function defaultOgImageUrl(): string {
  return absoluteUrl(brandConfig.branding.ogImageUrl || '/og-default');
}

/**
 * Open Graph block for a page. A page-level `openGraph` replaces the root layout's
 * whole block in Next.js, so pages that set their own title/description must also
 * restate the share image, URL, site name and locale or they lose them.
 */
export function pageOpenGraph({ title, description, path, type = 'website', images }: {
  title: string;
  description?: string;
  path: string;
  type?: 'website' | 'article';
  images?: NonNullable<Metadata['openGraph']>['images'];
}): NonNullable<Metadata['openGraph']> {
  return {
    title,
    ...(description ? { description } : {}),
    url: absoluteUrl(path),
    siteName: SITE_NAME,
    locale: 'en_AU',
    type,
    images: images ?? [{ url: defaultOgImageUrl(), width: 1200, height: 630 }],
  };
}
