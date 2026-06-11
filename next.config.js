/** @type {import('next').NextConfig} */
const nextConfig = {
  // Đảm bảo NEXTAUTH_URL có giá trị khi build (tránh TypeError: Invalid URL)
  env: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || "https://timio.vn",
  },
  webpack: (config, { isServer }) => {
    // face-api / tensorflow cần các fallback này khi build cho browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        path: false,
        os: false,
        stream: false,
        buffer: false,
        encoding: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
