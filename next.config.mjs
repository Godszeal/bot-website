/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
    serverComponentsExternalPackages: [
      '@whiskeysockets/baileys',
      'pino',
      'qrcode',
      '@hapi/boom',
      'audio-decode',
      'jimp',
      'link-preview-js',
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
}

export default nextConfig
