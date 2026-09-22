import type { NextConfig } from 'next';

const config: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  poweredByHeader: false,
};
export default config;
