/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Disable SSR for specific routes that use client-side only features
    appDir: true,
  },
  // Optimize for production
  compress: true,
  // Handle external packages
  transpilePackages: ['leaflet', 'react-leaflet'],
  // Configure webpack for better-sqlite3
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle better-sqlite3 on server side
      config.externals.push('better-sqlite3');
    }
    return config;
  },
  // Environment configuration
  env: {
    DATABASE_PATH: process.env.DATABASE_PATH || '/app/data/race_data.db',
  },
};

export default nextConfig;
