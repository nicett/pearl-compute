/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 移除 X-Powered-By: Next.js 头，缩小指纹面
  poweredByHeader: false,
}

module.exports = nextConfig
