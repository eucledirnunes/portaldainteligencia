import type { NextConfig } from 'next';

const config: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  poweredByHeader: false,
  // Página de história em HTML estático (public/como-funciona.html) com o motor de rolagem em public/fx.
  async rewrites() {
    return [{ source: '/como-funciona', destination: '/como-funciona.html' }];
  },
};
export default config;
