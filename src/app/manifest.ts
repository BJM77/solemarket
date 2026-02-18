import { MetadataRoute } from 'next';
import { brandConfig, SITE_NAME } from '@/config/brand';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: SITE_NAME,
        short_name: SITE_NAME,
        description: brandConfig.company.description,
        start_url: '/',
        display: 'standalone',
        background_color: '#F5F5F5',
        theme_color: '#111111',
        icons: [
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
