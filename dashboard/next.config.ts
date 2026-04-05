import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@shelby-protocol/sdk'],
};

export default nextConfig;
