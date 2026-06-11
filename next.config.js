/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Cloudflare Pages 默认不提供 Next.js Image Optimization runtime，
  // 任何 next/image 调用都必须以未优化模式提供，否则线上会 404
  images: {
    unoptimized: true,
  },

  // 移除 X-Powered-By: Next.js 头，缩小指纹面
  poweredByHeader: false,

  // 注：不要在这里加 output: 'export' 或 'standalone'，会与
  // @cloudflare/next-on-pages 的构建链路冲突
}

module.exports = nextConfig
