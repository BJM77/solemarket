
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  serverExternalPackages: [
    'firebase-admin',
    '@genkit-ai/google-genai',
    'genkit',
    '@google-cloud/firestore',
    'sharp',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
      allowedOrigins: [
        'studio-3973035687-658c0.web.app',
        'benched.au',
        'www.benched.au',
        'localhost:9007',
        '127.0.0.1:9007'
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
    return [
      {
        source: '/(.*)',
        headers: [
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
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups', // Required for Google Sign-In popup to work
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
