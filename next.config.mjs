/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()"
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on"
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js needs 'unsafe-inline' and 'unsafe-eval' in dev; Stripe + Google sign-in scripts.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://accounts.google.com https://*.googleusercontent.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.fontshare.com",
      "img-src 'self' data: blob: https://images.unsplash.com https://images.pexels.com https://res.cloudinary.com https://*.googleusercontent.com https://gen.pollinations.ai https://*.tile.openstreetmap.org",
      "connect-src 'self' https://api.stripe.com https://gen.pollinations.ai https://accounts.google.com https://oauth2.googleapis.com https://maps.googleapis.com https://nominatim.openstreetmap.org",
      "frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  }
];

const nextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
    instrumentationHook: true
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      }
    ];
  }
};

export default nextConfig;
