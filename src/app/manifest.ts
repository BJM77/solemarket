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
                src: '/favicon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: '/logo.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
            },
            {
                src: '/logo.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
            },
        ],
    };
}
