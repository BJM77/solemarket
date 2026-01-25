
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  turbopack: {}, // Empty config to silence Turbopack warning
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
        'localhost:9004'
      ],
    },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
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
            key: 'Permissions-Policy',
            value: 'camera=*', // Allow camera from any origin to fix permission issues
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
