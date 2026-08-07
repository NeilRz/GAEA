import type { NextConfig } from "next";

/* Baseline security headers. A full Content-Security-Policy is deferred:
   the marketing pages render via dangerouslySetInnerHTML and the layout
   injects JSON-LD inline, so script-src needs nonce/hash plumbing first.
   frame-ancestors alone is a valid CSP and blocks clickjacking today. */
const baseHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const denyFraming = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
];

/* The whitepaper reader on /whitepaper embeds this PDF in an iframe, and
   X-Frame-Options: DENY blocks that even same-origin, so the reader rendered
   blank in production. SAMEORIGIN still blocks every other origin, which is
   the protection that matters. Scoped to the one file rather than relaxed
   site-wide. */
const allowSameOriginFraming = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
];

const WHITEPAPER_PDF = "/GEOM-Whitepaper-v3.0.pdf";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: [...baseHeaders, ...denyFraming] },
      // Listed last on purpose: where two rules match the same path and set
      // the same header, the later one wins.
      { source: WHITEPAPER_PDF, headers: allowSameOriginFraming },
    ];
  },
};

export default nextConfig;
