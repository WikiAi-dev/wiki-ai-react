/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Handle browser extension interference and hydration issues
  experimental: {
    optimizeCss: true,
  },
  // Proxies all /v1/* HTTP calls to the backend so the browser only ever
  // talks to this server's own origin (see lib/config.ts's BASE_URL, which
  // is "" for exactly this reason). BACKEND_URL is read server-side when
  // this runs (next start / the standalone server.js) — it is deliberately
  // not NEXT_PUBLIC_-prefixed, so it's never baked into the client bundle
  // and can be changed at deploy time without a rebuild.
  //
  // This does not cover /v1/query/stream: Next.js rewrites don't proxy
  // WebSocket upgrade requests, so that connection is still made directly
  // by the browser via NEXT_PUBLIC_WS_URL.
  async rewrites() {
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:9001').replace(/\/$/, '')
    return [
      {
        source: '/v1/:path*',
        destination: `${backendUrl}/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
