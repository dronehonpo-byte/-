/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // .html を文字列としてインポートできるようにする（/violin ルートで配信するため）
  webpack(config) {
    config.module.rules.push({ test: /\.html$/, type: "asset/source" });
    return config;
  },
};

export default nextConfig;
