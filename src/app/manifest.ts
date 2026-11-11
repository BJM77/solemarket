import { MetadataRoute } from 'next';
import { brandConfig, SITE_NAME } from '@/config/brand';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: SITE_NAME,
        description: brandConfig.company.description,
        id: '/',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#f26c0d',
        icons: [
            // iPhone Home Screen app (needed for web push on iOS 16.4+).
            {
                src: '/apple-touch-icon.png',
                sizes: '180x180',
                type: 'image/png',
            },
            {
                src: brandConfig.branding.faviconUrl,
                sizes: 'any',
                type: 'image/png',
            },
            {
                src: brandConfig.branding.logoUrl,
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: brandConfig.branding.logoUrl,
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
