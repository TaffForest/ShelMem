import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@shelby-protocol/sdk'],
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    // Skip static prerendering of error pages to avoid Radix + React 19 SSR issues
  },
};

export default nextConfig;
