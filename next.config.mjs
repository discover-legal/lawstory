/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone server bundle for the Docker image (Dockerfile copies .next/standalone).
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // No next/image use: turn the /_next/image optimizer endpoint off rather than leave it reachable.
  images: { unoptimized: true },
  // Security headers (CSP, frame rules) arrive with S6; redirects with S7. See README.
};

export default nextConfig;
