
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: [
    'firebase-admin',
    '@genkit-ai/google-genai',
    'genkit',
    '@google-cloud/firestore',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'studio-8322868971-8ca89.web.app',
        'picksy.au',
        'www.picksy.au',
        'localhost:9004',
        'localhost:9005',
        '127.0.0.1:9004',
        '127.0.0.1:9005'
      ],
    },
  },
  typescript: {
    // ignoreBuildErrors: true, // Re-enabling strict checks
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.firebaseapp.com',
      },
      {
        protocol: 'https',
        hostname: '**.appspot.com'
      },
      {
        protocol: 'https',
        hostname: '**.firebasestorage.app'
      },
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      }
    ],
  },
  async headers() {
    // Content Security Policy
    const cspHeader = `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: blob: https: *.googleapis.com *.firebasestorage.app *.firebaseapp.com;
      font-src 'self';
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      connect-src 'self' https://*.googleapis.com https://firebaseremoteconfig.googleapis.com https://*.firebasestorage.app https://*.firebaseapp.com https://www.googletagmanager.com https://www.google-analytics.com blob: data:;
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()', // Allow camera from same origin
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize firebase-admin and related packages for server-side
      config.externals = config.externals || [];
      config.externals.push({
        'firebase-admin': 'commonjs firebase-admin',
        '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
        '@genkit-ai/google-genai': 'commonjs @genkit-ai/google-genai',
      });
    }
    return config;
  },
}

module.exports = nextConfig
