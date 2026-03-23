/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['undici'],
  experimental: {
    serverComponentsExternalPackages: ['bull', 'ioredis'],
  },
  images: {
    domains: ['localhost', 'cleandata.app'],
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
        has: [
          {
            type: 'cookie',
            key: 'supabase-auth-token',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
