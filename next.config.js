
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Always resolve metadata before streaming so <title>, meta description,
  // canonical, Open Graph and robots tags land in <head>. With Next 15's default
  // streaming metadata, dynamic pages (listings, /browse, /cards, /shoes, /coins,
  // /brand/*) emitted them inside <body> on live benched.au, even for crawlers:
  // Google ignores rel=canonical outside <head>, and Lighthouse SEO failed
  // meta-description. Product/category metadata reuses the page's cached
  // Firestore read, so the extra wait before first byte is small.
  htmlLimitedBots: /.*/,
  // Optional: set NEXT_DEPLOYMENT_ID at build time so Next can detect skew and hard-reload.
  // Safe when unset (no-op). Firebase App Hosting does not require this.
  ...(process.env.NEXT_DEPLOYMENT_ID
    ? { deploymentId: process.env.NEXT_DEPLOYMENT_ID }
    : {}),
  // output: 'standalone',
  serverExternalPackages: [
    'firebase-admin',
    '@genkit-ai/google-genai',
    'genkit',
    '@google-cloud/firestore',
    'sharp',
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
      allowedOrigins: [
        'https://studio-3973035687-658c0.web.app',
        'https://benched.au',
        'https://www.benched.au',
        // Add localhost conditionally for dev
        ...(process.env.NODE_ENV === 'development' ? [
           'localhost:3000',
           'http://localhost:3000',
           'localhost:9007',
           'http://localhost:9007',
           'localhost:9008',
           'http://localhost:9008'
        ] : [])
      ],
    },
  },
  typescript: {
    // ignoreBuildErrors: true, // Re-enabling strict checks
  },
  images: {
    // Firebase App Hosting disables Next image optimisation unless this is explicitly false.
    // Without it, raw 2-3 MB Storage originals were shipped to phones (Lighthouse: -13 MB).
    unoptimized: false,
    formats: ['image/avif', 'image/webp'],
    qualities: [25, 50, 75, 80, 90, 100],
    minimumCacheTTL: 2592000, // 30 days - product photo URLs are immutable (tokenised)
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
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
    ],
  },
  // Sitemap index lives at src/app/sitemap.xml/route.ts.
  async redirects() {
    return [
      // Routes that previously fell through to the generic category template.
      { source: '/sell/guide', destination: '/sell', permanent: true },
      { source: '/profile/settings', destination: '/profile', permanent: false },
      { source: '/search', has: [{ type: 'query', key: 'q' }], destination: '/browse', permanent: true },
      { source: '/search', destination: '/browse', permanent: true },
    ];
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
}

const { withSentryConfig } = require('@sentry/nextjs/config');

module.exports = withSentryConfig(
  nextConfig,
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options
    silent: true,
    org: "benched",
    project: "benched-au",
  },
  {
    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
  }
);
