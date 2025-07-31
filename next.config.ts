import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  compress: true,
  // Handle external packages
  transpilePackages: ['leaflet', 'react-leaflet'],
  // Configure webpack for Vercel compatibility
  webpack: (config, { isServer }) => {
    // No special configuration needed for JSON-based storage
    return config;
  },
  // Environment configuration
  env: {
    DATA_PATH: process.env.DATA_PATH || '/tmp/race_data.json',
  },
};

export default nextConfig;
