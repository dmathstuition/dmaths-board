/** @type {import('next').NextConfig} */

// Content-Security-Policy: only the origins the board uses (Supabase, Paystack, Google Fonts).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.paystack.co",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.paystack.co https://script.google.com https://script.googleusercontent.com",
  "frame-src https://checkout.paystack.com https://*.paystack.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: { serverComponentsExternalPackages: ["@supabase/ssr", "web-push"] },
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // Old links from when the board lived at dmaths.academy/board/...
  async redirects() {
    return [
      { source: "/board", destination: "/", permanent: true },
      { source: "/board/:path*", destination: "/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
