/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Leaflet from server-side bundle
      config.externals = [...(config.externals || []), 'leaflet', 'react-leaflet'];
    }
    return config;
  },
};

export default nextConfig;
