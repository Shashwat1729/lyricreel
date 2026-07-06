/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable server-side chunk splitting to avoid WSL filesystem race conditions
  // that corrupt webpack chunk files (e.g., "Cannot find module './682.js'")
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: false,
        runtimeChunk: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
