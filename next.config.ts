import path from 'node:path';
import type { NextConfig } from 'next';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

const homepageDiscoveryLink = [
  '</.well-known/api-catalog>; rel="api-catalog"',
  '</docs/api-reference>; rel="service-doc"',
  '</.well-known/agent-skills/index.json>; rel="describedby"',
  '</llms.txt>; rel="describedby"; type="text/plain"',
].join(', ');

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.google.com https://www.gstatic.com",
      "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://*.googletagmanager.com https://www.googletagmanager.com https://api.resend.com https://*.upstash.io https://*.upstash.dev https://*.sanity.io https://*.api.sanity.io https://*.apicdn.sanity.io",
      "frame-src 'self' https://www.googletagmanager.com https://www.youtube.com https://player.vimeo.com",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; '),
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
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains; preload',
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server build (.next/standalone) for the Docker image.
  output: 'standalone',
  turbopack: {
    root: path.resolve(__dirname),
  },
  // Required for Sanity Studio embedded at /studio
  transpilePackages: ['sanity'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
    ],
  },
  async redirects() {
    return [
      // Legacy /docs/quick-start linked from the homepage and older materials
      {
        source: '/docs/quick-start',
        destination: '/docs/quickstart-ai-agents',
        permanent: true,
      },
      // Legacy /docs/quickstart linked from Sanity blog content and external inlinks
      {
        source: '/docs/quickstart',
        destination: '/docs/quickstart-ai-agents',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/',
        headers: [
          {
            key: 'Link',
            value: homepageDiscoveryLink,
          },
        ],
      },
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // api.kakunin.ai/v1/* → /api/v1/* (strips the /api prefix for the clean API subdomain)
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/v1/:path*',
      },
    ];
  },
};

export default withMDX(nextConfig);
