/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // better-sqlite3 是原生模块，交给 Node 运行时直接 require，不参与打包
  serverExternalPackages: ['better-sqlite3'],
  images: {
    unoptimized: true,
  },
}

export default nextConfig
