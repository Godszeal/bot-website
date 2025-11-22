/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  serverExternalPackages: [
    '@whiskeysockets/baileys',
    'pino',
    'qrcode',
    '@hapi/boom',
    'audio-decode',
    'jimp',
    'link-preview-js',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  turbopack: {},
}

export default nextConfig
